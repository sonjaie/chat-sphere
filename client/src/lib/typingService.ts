import { supabase } from './supabase'

export interface TypingUser {
  user_id: string
  chat_id: string
  is_typing: boolean
  started_at: string
}

/**
 * Realtime, DB-less typing service using Supabase Broadcast.
 * - No migrations or writes
 * - Works even if Postgres changes are slow
 */
export class TypingService {
  private static typingTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
  private static channels = new Map<string, ReturnType<typeof supabase.channel>>()
  private static activeTypers = new Map<string, Map<string, number>>() // chatId -> (userId -> lastTs)

  private static getOrCreateChannel(chatId: string) {
    if (this.channels.has(chatId)) return this.channels.get(chatId)!
    const channel = supabase.channel(`typing:${chatId}`, {
      config: { broadcast: { ack: true } }
    })
    this.channels.set(chatId, channel)
    return channel
  }

  /**
   * Subscribe to typing indicators for a specific chat via Broadcast
   */
  static subscribeToTyping(
    chatId: string,
    onTypingUpdate: (typingUsers: TypingUser[]) => void
  ) {
    const channel = this.getOrCreateChannel(chatId)

    // Initialize cache for this chat
    if (!this.activeTypers.has(chatId)) this.activeTypers.set(chatId, new Map())

    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_id, is_typing } = payload.payload as { user_id: string; is_typing: boolean }

        const key = `${chatId}-${user_id}`
        const chatMap = this.activeTypers.get(chatId)!

        // Clear existing timer
        const existing = this.typingTimeouts.get(key)
        if (existing) clearTimeout(existing)

        if (is_typing) {
          // Mark as active and set expiry timer
          chatMap.set(user_id, Date.now())
          const timeout = setTimeout(() => {
            chatMap.delete(user_id)
            this.typingTimeouts.delete(key)
            onTypingUpdate(this.mapToTypingUsers(chatId, chatMap))
          }, 3000)
          this.typingTimeouts.set(key, timeout)
        } else {
          chatMap.delete(user_id)
          this.typingTimeouts.delete(key)
        }

        onTypingUpdate(this.mapToTypingUsers(chatId, chatMap))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      this.channels.delete(chatId)
      this.activeTypers.delete(chatId)
    }
  }

  private static mapToTypingUsers(chatId: string, chatMap: Map<string, number>): TypingUser[] {
    return Array.from(chatMap.keys()).map((userId) => ({
      user_id: userId,
      chat_id: chatId,
      is_typing: true,
      started_at: new Date(chatMap.get(userId)!).toISOString(),
    }))
  }

  /**
   * Start typing: broadcast an event to peers in the chat
   */
  static async startTyping(chatId: string, userId: string): Promise<void> {
    const channel = this.getOrCreateChannel(chatId)
    await channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId, is_typing: true } })

    // Locally also schedule a stop to reduce spam if caller forgets
    const key = `${chatId}-${userId}`
    const existing = this.typingTimeouts.get(key)
    if (existing) clearTimeout(existing)
    const timeout = setTimeout(() => this.stopTyping(chatId, userId), 3000)
    this.typingTimeouts.set(key, timeout)
  }

  /**
   * Stop typing: broadcast false
   */
  static async stopTyping(chatId: string, userId: string): Promise<void> {
    const channel = this.getOrCreateChannel(chatId)
    await channel.send({ type: 'broadcast', event: 'typing', payload: { user_id: userId, is_typing: false } })

    const key = `${chatId}-${userId}`
    const existing = this.typingTimeouts.get(key)
    if (existing) {
      clearTimeout(existing)
      this.typingTimeouts.delete(key)
    }
  }
}
