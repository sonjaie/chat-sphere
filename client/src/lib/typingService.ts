import { supabase } from './supabase'

export interface TypingUser {
  user_id: string
  chat_id: string
  is_typing: boolean
  started_at: string
}

export class TypingService {
  private static typingTimeouts = new Map<string, NodeJS.Timeout>()

  /**
   * Subscribe to typing indicators for a specific chat
   */
  static subscribeToTyping(
    chatId: string,
    onTypingUpdate: (typingUsers: TypingUser[]) => void
  ) {
    const channel = supabase
      .channel(`typing:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          // Get all current typing users for this chat
          const { data: typingUsers, error } = await supabase
            .from('typing_indicators')
            .select('*')
            .eq('chat_id', chatId)
            .eq('is_typing', true)
            .order('started_at', { ascending: true })

          if (!error && typingUsers) {
            onTypingUpdate(typingUsers as TypingUser[])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Start typing indicator
   */
  static async startTyping(chatId: string, userId: string): Promise<void> {
    // Clear any existing timeout
    const timeoutKey = `${chatId}-${userId}`
    const existingTimeout = this.typingTimeouts.get(timeoutKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set typing to true
    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        chat_id: chatId,
        user_id: userId,
        is_typing: true,
        started_at: new Date().toISOString(),
      }, {
        onConflict: 'chat_id,user_id'
      })

    if (error) {
      console.error('Error starting typing indicator:', error)
      return
    }

    // Set timeout to stop typing after 3 seconds of inactivity
    const timeout = setTimeout(() => {
      this.stopTyping(chatId, userId)
    }, 3000)

    this.typingTimeouts.set(timeoutKey, timeout)
  }

  /**
   * Stop typing indicator
   */
  static async stopTyping(chatId: string, userId: string): Promise<void> {
    // Clear timeout
    const timeoutKey = `${chatId}-${userId}`
    const existingTimeout = this.typingTimeouts.get(timeoutKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
      this.typingTimeouts.delete(timeoutKey)
    }

    // Set typing to false
    const { error } = await supabase
      .from('typing_indicators')
      .upsert({
        chat_id: chatId,
        user_id: userId,
        is_typing: false,
        started_at: new Date().toISOString(),
      }, {
        onConflict: 'chat_id,user_id'
      })

    if (error) {
      console.error('Error stopping typing indicator:', error)
    }
  }

  /**
   * Get current typing users for a chat
   */
  static async getTypingUsers(chatId: string): Promise<TypingUser[]> {
    const { data: typingUsers, error } = await supabase
      .from('typing_indicators')
      .select('*')
      .eq('chat_id', chatId)
      .eq('is_typing', true)
      .order('started_at', { ascending: true })

    if (error) {
      console.error('Error getting typing users:', error)
      return []
    }

    return typingUsers as TypingUser[]
  }
}
