// Direct type definitions to avoid circular imports
export interface AuthUser {
  id: string
  email: string
  name: string
  profile_picture?: string
  status: 'online' | 'offline' | 'away'
  last_seen: string
  profilePicture?: string // For compatibility
  lastSeen?: Date // For compatibility
}

export interface User extends AuthUser {
  // Legacy compatibility
}

export interface ChatWithDetails {
  id: string
  type: '1:1' | 'group'
  name: string | null
  description: string | null
  avatar: string | null
  created_by: string
  created_at: string
  updated_at: string
  members: any[]
  last_message?: MessageWithDetails
  unread_count: number
  otherUser?: AuthUser
}

export interface MessageWithDetails {
  id: string
  chat_id: string
  sender_id: string
  content: string
  type: string
  created_at: string | null
  updated_at: string | null
  edited_at: string | null
  deleted_at: string | null
  is_deleted: boolean | null
  is_edited: boolean | null
  sender: AuthUser
  reactions: any[]
  reply_to?: MessageWithDetails
}

export interface StoryWithDetails {
  id: string
  user_id: string
  content: string | null
  media_url: string | null
  created_at: string | null
  expiry_time: string | null
  user: AuthUser
  viewers: any[]
  is_viewed?: boolean
  // Legacy compatibility fields
  userId?: string
  media?: string
  caption?: string
  createdAt?: Date | string
  expiryTime?: Date | string
}

// Legacy type aliases for backward compatibility
export type ChatWithLastMessage = ChatWithDetails
export type MessageWithReactions = MessageWithDetails
export type StoryWithUser = StoryWithDetails
export type Chat = ChatWithDetails
export type Message = MessageWithDetails
export type Story = StoryWithDetails
