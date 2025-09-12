import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your environment configuration.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          profile_picture: string | null
          status: 'online' | 'offline' | 'away'
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          profile_picture?: string | null
          status?: 'online' | 'offline' | 'away'
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          profile_picture?: string | null
          status?: 'online' | 'offline' | 'away'
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
      }
      chats: {
        Row: {
          id: string
          type: '1:1' | 'group'
          name: string | null
          description: string | null
          avatar: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type?: '1:1' | 'group'
          name?: string | null
          description?: string | null
          avatar?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: '1:1' | 'group'
          name?: string | null
          description?: string | null
          avatar?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_members: {
        Row: {
          id: string
          chat_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
          last_read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          role?: 'admin' | 'member'
          joined_at?: string
          last_read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
          last_read_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          chat_id: string
          sender_id: string
          reply_to_id: string | null
          content: string
          type: 'text' | 'image' | 'file' | 'video' | 'audio'
          metadata: any | null
          is_edited: boolean
          edited_at: string | null
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          sender_id: string
          reply_to_id?: string | null
          content: string
          type?: 'text' | 'image' | 'file' | 'video' | 'audio'
          metadata?: any | null
          is_edited?: boolean
          edited_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          sender_id?: string
          reply_to_id?: string | null
          content?: string
          type?: 'text' | 'image' | 'file' | 'video' | 'audio'
          metadata?: any | null
          is_edited?: boolean
          edited_at?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      message_reads: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string
          created_at?: string
        }
      }
      reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          emoji: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          emoji: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          emoji?: string
          created_at?: string
        }
      }
      stories: {
        Row: {
          id: string
          user_id: string
          media_url: string
          caption: string | null
          expiry_time: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          media_url: string
          caption?: string | null
          expiry_time: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          media_url?: string
          caption?: string | null
          expiry_time?: string
          created_at?: string
          updated_at?: string
        }
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          user_id: string
          viewed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          story_id: string
          user_id: string
          viewed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          story_id?: string
          user_id?: string
          viewed_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
