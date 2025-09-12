// Re-export Supabase types for compatibility
export type {
  AuthUser,
  ChatWithDetails as ChatWithLastMessage,
  MessageWithDetails as MessageWithReactions,
  StoryWithDetails as StoryWithUser,
  Database,
} from '../client/src/lib'

// Legacy type aliases for backward compatibility
export type User = AuthUser
export type Chat = ChatWithDetails
export type Message = MessageWithDetails
export type Story = StoryWithDetails
