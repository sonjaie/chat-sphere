import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string
  profile_picture?: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
  profilePicture?: string // For compatibility
}

export class AuthService {
  static async signUp(email: string, password: string, name: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (error) throw error

    // Create user profile in users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          name,
          email,
          password: 'supabase_auth_handled', // Supabase Auth handles password
          status: 'offline',
          last_seen: new Date().toISOString(),
        })

      // If profile creation fails due to duplicate, that's okay - profile might already exist
      if (profileError && profileError.code !== '23505') {
        console.error('Error creating user profile:', profileError)
        throw profileError
      }
    }

    return { user: data.user, session: data.session }
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    // Ensure user profile exists and update status to online
    if (data.user) {
      // Check if profile exists, create if not
      const currentUser = await this.getCurrentUser()
      if (currentUser) {
        await this.updateUserStatus(data.user.id, 'online')
      }
    }

    return { user: data.user, session: data.session }
  }

  static async signOut() {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await this.updateUserStatus(user.id, 'offline')
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email!)
      .single()

    // If profile doesn't exist, create it automatically
    if (profileError && profileError.code === 'PGRST116') {
      console.log('User profile not found, creating one...')
      
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email!,
          password: 'supabase_auth_handled',
          status: 'offline',
          last_seen: new Date().toISOString(),
        })
        .select()
        .single()

      // If creation fails due to duplicate email, try to fetch the existing profile
      if (createError && createError.code === '23505') {
        console.log('Profile already exists, fetching existing profile...')
        
        const { data: existingProfile, error: fetchError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single()

        if (fetchError || !existingProfile) {
          console.error('Error fetching existing profile:', fetchError)
          return null
        }

        return {
          id: existingProfile.id,
          email: existingProfile.email,
          name: existingProfile.name,
          profile_picture: existingProfile.profile_picture,
          status: existingProfile.status,
          last_seen: existingProfile.last_seen,
        }
      }

      if (createError || !newProfile) {
        console.error('Error creating user profile:', createError)
        return null
      }

      return {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        profile_picture: newProfile.profile_picture,
        status: newProfile.status,
        last_seen: newProfile.last_seen,
      }
    }

    if (profileError || !profile) return null

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      profile_picture: profile.profile_picture,
      status: profile.status,
      last_seen: profile.last_seen,
    }
  }

  static async updateUserStatus(userId: string, status: 'online' | 'offline' | 'away') {
    const { error } = await supabase
      .from('users')
      .update({ 
        status,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) throw error
  }

  static async getAllUsers(): Promise<User[]> {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('name')

    if (error) throw error
    return users || []
  }

  /**
   * Subscribe to new users being added to the system
   */
  static subscribeToUsers(
    onNewUser: (user: User) => void,
    onUserUpdate: (user: User) => void
  ) {
    const channel = supabase
      .channel('users-subscription')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          console.log('New user registered:', payload.new);
          onNewUser(payload.new as User);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload) => {
          console.log('User updated:', payload.new);
          onUserUpdate(payload.new as User);
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  static async updateProfile(userId: string, updates: {
    name?: string
    profile_picture?: string
  }) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
  }

  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await this.updateUserStatus(session.user.id, 'online')
        const user = await this.getCurrentUser()
        callback(user)
      } else if (event === 'SIGNED_OUT') {
        callback(null)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const user = await this.getCurrentUser()
        callback(user)
      }
    })
  }
}
