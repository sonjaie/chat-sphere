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

    // Overlay presence_state if available to avoid stale users.status
    let effectiveStatus: 'online' | 'offline' | 'away' = profile.status as any
    let effectiveLastSeen: string = profile.last_seen
    try {
      const { data: p } = await supabase
        .from('presence_state')
        .select('state,last_activity_at,changed_at')
        .eq('user_id', profile.id)
        .maybeSingle()
      if (p?.state) {
        const s = String(p.state).toLowerCase()
        if (s === 'online' || s === 'offline' || s === 'away') {
          effectiveStatus = s
        }
        effectiveLastSeen = p.last_activity_at || p.changed_at || effectiveLastSeen
      }
    } catch {
      // ignore overlay errors; fall back to users.status
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      profile_picture: profile.profile_picture,
      status: effectiveStatus,
      last_seen: effectiveLastSeen,
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

    const all: User[] = users || []

    // Fetch presence snapshot and overlay "state" onto users.status for accuracy
    try {
      const { data: presences } = await supabase
        .from('presence_state')
        .select('user_id,state,last_activity_at,changed_at')
      const map = new Map<string, { state: string; last_seen?: string }>()
      presences?.forEach((p: any) => {
        map.set(p.user_id, {
          state: String(p.state).toLowerCase(),
          last_seen: p.last_activity_at || p.changed_at,
        })
      })
      return all.map((u) => {
        const p = map.get(u.id as unknown as string)
        if (!p) return u
        const status = (p.state === 'online' || p.state === 'offline' || p.state === 'away') ? p.state : (u as any).status
        return { ...u, status, last_seen: p.last_seen || (u as any).last_seen }
      })
    } catch {
      // If overlay fails, return original users
      return all
    }
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
