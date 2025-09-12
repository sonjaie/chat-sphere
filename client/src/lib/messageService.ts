import { supabase } from './supabase'
import type { Database } from './supabase'

type Message = Database['public']['Tables']['messages']['Row']
type InsertMessage = Database['public']['Tables']['messages']['Insert']
type UpdateMessage = Database['public']['Tables']['messages']['Update']
type User = Database['public']['Tables']['users']['Row']
type Reaction = Database['public']['Tables']['reactions']['Row']
type InsertReaction = Database['public']['Tables']['reactions']['Insert']

export interface MessageWithDetails extends Message {
  sender: User
  reactions: Reaction[]
  reply_to?: Message & { sender: User }
  read_by: Database['public']['Tables']['message_reads']['Row'][]
}

export class MessageService {
  static async getMessages(
    chatId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageWithDetails[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users(*),
        reactions(*),
        message_reads(*),
        reply_to:messages!reply_to_id(
          *,
          sender:users(*)
        )
      `)
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return (messages as any[]).reverse() // Reverse to show oldest first
  }

  static async sendMessage(data: InsertMessage): Promise<MessageWithDetails> {
    const { data: message, error } = await supabase
      .from('messages')
      .insert(data)
      .select(`
        *,
        sender:users(*),
        reactions(*),
        message_reads(*),
        reply_to:messages!reply_to_id(
          *,
          sender:users(*)
        )
      `)
      .single()

    if (error || !message) throw error

    return message as any
  }

  static async editMessage(messageId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        content,
        is_edited: true,
        edited_at: new Date().toISOString(),
      })
      .eq('id', messageId)

    if (error) throw error
  }

  static async deleteMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId)

    if (error) throw error
  }

  static async addReaction(data: InsertReaction): Promise<void> {
    const { error } = await supabase
      .from('reactions')
      .upsert(data, {
        onConflict: 'message_id,user_id,emoji'
      })

    if (error) throw error
  }

  static async removeReaction(messageId: string, userId: string, emoji: string): Promise<void> {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji)

    if (error) throw error
  }

  static async markAsRead(messageId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('message_reads')
      .upsert({
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString(),
      })

    if (error) throw error
  }

  static async getUnreadMessages(chatId: string, userId: string): Promise<MessageWithDetails[]> {
    // Get user's last read timestamp for this chat
    const { data: lastRead, error: readError } = await supabase
      .from('chat_members')
      .select('last_read_at')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single()

    if (readError && readError.code !== 'PGRST116') {
      throw readError
    }

    let query = supabase
      .from('messages')
      .select(`
        *,
        sender:users(*),
        reactions(*),
        message_reads(*),
        reply_to:messages!reply_to_id(
          *,
          sender:users(*)
        )
      `)
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .neq('sender_id', userId)

    if (lastRead?.last_read_at) {
      query = query.gt('created_at', lastRead.last_read_at)
    }

    const { data: messages, error } = await query.order('created_at', { ascending: true })

    if (error) throw error

    return messages as any[]
  }

  static async searchMessages(
    chatId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<MessageWithDetails[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users(*),
        reactions(*),
        message_reads(*),
        reply_to:messages!reply_to_id(
          *,
          sender:users(*)
        )
      `)
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .textSearch('content', searchTerm)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error

    return messages as any[]
  }

  static async getMessageReactions(messageId: string): Promise<Reaction[]> {
    const { data: reactions, error } = await supabase
      .from('reactions')
      .select('*')
      .eq('message_id', messageId)

    if (error) throw error

    return reactions || []
  }

  static subscribeToMessages(
    chatId: string,
    onNewMessage: (message: MessageWithDetails) => void,
    onUpdate: (message: MessageWithDetails) => void,
    onDelete: (messageId: string) => void
  ) {
    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const message = payload.new as Message
          const { data: messageWithDetails, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users(*),
              reactions(*),
              message_reads(*),
              reply_to:messages!reply_to_id(
                *,
                sender:users(*)
              )
            `)
            .eq('id', message.id)
            .single()

          if (!error && messageWithDetails) {
            onNewMessage(messageWithDetails as any)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const message = payload.new as Message
          const { data: messageWithDetails, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users(*),
              reactions(*),
              message_reads(*),
              reply_to:messages!reply_to_id(
                *,
                sender:users(*)
              )
            `)
            .eq('id', message.id)
            .single()

          if (!error && messageWithDetails) {
            onUpdate(messageWithDetails as any)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const message = payload.new as Message
          if (message.is_deleted) {
            onDelete(message.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  /**
   * Subscribe to all messages for all chats a user is part of
   * This is used to update the sidebar when messages arrive in any chat
   */
  static subscribeToAllUserMessages(
    userId: string,
    onNewMessage: (message: MessageWithDetails) => void,
    onUpdate: (message: MessageWithDetails) => void,
    onDelete: (messageId: string) => void
  ) {
    const channel = supabase
      .channel(`user-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as Message
          
          // Check if the user is a member of this chat
          const { data: membership } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('chat_id', message.chat_id)
            .eq('user_id', userId)
            .single()

          if (membership) {
            const { data: messageWithDetails, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users(*),
                reactions(*),
                message_reads(*),
                reply_to:messages!reply_to_id(
                  *,
                  sender:users(*)
                )
              `)
              .eq('id', message.id)
              .single()

            if (!error && messageWithDetails) {
              onNewMessage(messageWithDetails as any)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.new as Message
          
          // Check if the user is a member of this chat
          const { data: membership } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('chat_id', message.chat_id)
            .eq('user_id', userId)
            .single()

          if (membership) {
            const { data: messageWithDetails, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users(*),
                reactions(*),
                message_reads(*),
                reply_to:messages!reply_to_id(
                  *,
                  sender:users(*)
                )
              `)
              .eq('id', message.id)
              .single()

            if (!error && messageWithDetails) {
              onUpdate(messageWithDetails as any)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const message = payload.old as Message
          
          // Check if the user is a member of this chat
          const { data: membership } = await supabase
            .from('chat_members')
            .select('chat_id')
            .eq('chat_id', message.chat_id)
            .eq('user_id', userId)
            .single()

          if (membership) {
            onDelete(message.id)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}
