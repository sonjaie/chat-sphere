import { supabase } from './supabase'
import type { Database } from './supabase'

type Story = Database['public']['Tables']['stories']['Row']
type InsertStory = Database['public']['Tables']['stories']['Insert']
type UpdateStory = Database['public']['Tables']['stories']['Update']
type User = Database['public']['Tables']['users']['Row']
type StoryView = Database['public']['Tables']['story_views']['Row']

export interface StoryWithDetails extends Story {
  user: User
  viewers: StoryView[]
  is_viewed?: boolean
}

export class StoryService {
  static async getActiveStories(userId: string): Promise<StoryWithDetails[]> {
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        user:users(*),
        story_views(*)
      `)
      .gt('expiry_time', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    // Filter out user's own stories and add view status
    const filteredStories = stories
      ?.filter(story => story.user_id !== userId)
      .map(story => ({
        ...story,
        is_viewed: story.story_views?.some((view: StoryView) => view.user_id === userId) || false,
      })) || []

    return filteredStories as any[]
  }

  static async getUserStories(userId: string): Promise<StoryWithDetails[]> {
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        user:users(*),
        story_views(*)
      `)
      .eq('user_id', userId)
      .gt('expiry_time', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    return (stories as any[]) || []
  }

  static async createStory(data: InsertStory): Promise<Story> {
    const { data: story, error } = await supabase
      .from('stories')
      .insert(data)
      .select()
      .single()

    if (error || !story) throw error

    return story
  }

  static async deleteStory(storyId: string, userId: string): Promise<void> {
    // Verify ownership
    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single()

    if (fetchError || !story) throw fetchError || new Error('Story not found')
    if (story.user_id !== userId) throw new Error('Unauthorized')

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId)

    if (error) throw error
  }

  static async viewStory(storyId: string, userId: string): Promise<void> {
    // Check if already viewed
    const { data: existingView, error: checkError } = await supabase
      .from('story_views')
      .select('id')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError
    }

    if (!existingView) {
      const { error } = await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          user_id: userId,
          viewed_at: new Date().toISOString(),
        })

      if (error) throw error
    }
  }

  static async getStoryViews(storyId: string, userId: string): Promise<StoryView[]> {
    // Verify ownership
    const { data: story, error: fetchError } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', storyId)
      .single()

    if (fetchError || !story) throw fetchError || new Error('Story not found')
    if (story.user_id !== userId) throw new Error('Unauthorized')

    const { data: views, error } = await supabase
      .from('story_views')
      .select(`
        *,
        user:users(*)
      `)
      .eq('story_id', storyId)
      .order('viewed_at', { ascending: false })

    if (error) throw error

    return views || []
  }

  static async getStoryStats(userId: string): Promise<{
    total_stories: number
    total_views: number
    stories_this_week: number
  }> {
    // Get total stories
    const { count: totalStories, error: storiesError } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (storiesError) throw storiesError

    // Get total views
    const { data: storyViews, error: viewsError } = await supabase
      .from('story_views')
      .select('story_id')
      .in('story_id', 
        supabase
          .from('stories')
          .select('id')
          .eq('user_id', userId)
      )

    if (viewsError) throw viewsError

    // Get stories this week
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { count: storiesThisWeek, error: weekError } = await supabase
      .from('stories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekAgo.toISOString())

    if (weekError) throw weekError

    return {
      total_stories: totalStories || 0,
      total_views: storyViews?.length || 0,
      stories_this_week: storiesThisWeek || 0,
    }
  }

  static async cleanupExpiredStories(): Promise<void> {
    const { error } = await supabase
      .from('stories')
      .delete()
      .lt('expiry_time', new Date().toISOString())

    if (error) throw error
  }

  static subscribeToStories(
    userId: string,
    onNewStory: (story: StoryWithDetails) => void,
    onStoryUpdate: (story: StoryWithDetails) => void,
    onStoryDelete: (storyId: string) => void
  ) {
    const channel = supabase
      .channel(`stories:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stories',
          filter: `user_id=neq.${userId}`,
        },
        async (payload) => {
          const story = payload.new as Story
          if (new Date(story.expiry_time) > new Date()) {
            const { data: storyWithDetails, error } = await supabase
              .from('stories')
              .select(`
                *,
                user:users(*),
                story_views(*)
              `)
              .eq('id', story.id)
              .single()

            if (!error && storyWithDetails) {
              onNewStory(storyWithDetails as any)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'stories',
        },
        async (payload) => {
          const story = payload.new as Story
          const { data: storyWithDetails, error } = await supabase
            .from('stories')
            .select(`
              *,
              user:users(*),
              story_views(*)
            `)
            .eq('id', story.id)
            .single()

          if (!error && storyWithDetails) {
            onStoryUpdate(storyWithDetails as any)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'stories',
        },
        (payload) => {
          const story = payload.old as Story
          onStoryDelete(story.id)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}
