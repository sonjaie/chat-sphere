import { supabase } from './supabase'
import type { User, Session } from '@supabase/supabase-js'

export interface AuthUser {
  id: string
  email: string
  name: string
  profile_picture?: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
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
          status: 'offline',
          last_seen: new Date().toISOString(),
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
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

    // Update user status to online
    if (data.user) {
      await this.updateUserStatus(data.user.id, 'online')
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
      .eq('id', user.id)
      .single()

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
