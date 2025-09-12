import { supabase } from './supabase'
import type { Database } from './supabase'

type Chat = Database['public']['Tables']['chats']['Row']
type InsertChat = Database['public']['Tables']['chats']['Insert']
type UpdateChat = Database['public']['Tables']['chats']['Update']
type ChatMember = Database['public']['Tables']['chat_members']['Row']
type InsertChatMember = Database['public']['Tables']['chat_members']['Insert']
type Message = Database['public']['Tables']['messages']['Row']
type InsertMessage = Database['public']['Tables']['messages']['Insert']
type User = Database['public']['Tables']['users']['Row']

export interface ChatWithDetails extends Chat {
  members: (ChatMember & { user: User })[]
  last_message?: Message & { sender: User }
  unread_count: number
  otherUser?: User // For 1:1 chats
  lastMessage?: string
  lastMessageTime?: Date
}

export interface MessageWithDetails extends Message {
  sender: User
  reactions: Database['public']['Tables']['reactions']['Row'][]
  reply_to?: Message & { sender: User }
  chatId?: string // For compatibility
  senderId?: string // For compatibility
  timestamp?: string // For compatibility
  readBy?: Database['public']['Tables']['message_reads']['Row'][] // For compatibility
}

export class ChatService {
  static async getChats(userId: string): Promise<ChatWithDetails[]> {
    // Get all chats where user is a member
    const { data: chatMembers, error: membersError } = await supabase
      .from('chat_members')
      .select(`
        chat_id,
        chats (*)
      `)
      .eq('user_id', userId)

    if (membersError) throw membersError

    const chats: ChatWithDetails[] = []

    for (const member of chatMembers || []) {
      const chat = member.chats as any as Chat
      
      // Get chat members with user details
      const { data: chatMembersWithUsers, error: membersError } = await supabase
        .from('chat_members')
        .select(`
          *,
          user:users(*)
        `)
        .eq('chat_id', chat.id)

      if (membersError) {
        console.error('Error fetching chat members:', membersError)
        throw membersError
      }

      // Get last message
      const { data: lastMessages, error: messageError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users(*)
        `)
        .eq('chat_id', chat.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(1)

      if (messageError) {
        console.warn('Error fetching last message for chat:', chat.id, messageError)
        // Don't throw, just continue without last message
      }

      const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null

      // Get unread count
      const { data: lastRead, error: readError } = await supabase
        .from('chat_members')
        .select('last_read_at')
        .eq('chat_id', chat.id)
        .eq('user_id', userId)
        .single()

      let unreadCount = 0
      if (lastRead?.last_read_at) {
        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .neq('sender_id', userId)
          .eq('is_deleted', false)
          .gt('created_at', lastRead.last_read_at)

        if (countError) throw countError
        unreadCount = count || 0
      } else {
        const { count, error: countError } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', chat.id)
          .neq('sender_id', userId)
          .eq('is_deleted', false)

        if (countError) throw countError
        unreadCount = count || 0
      }

      // Find the other user for 1:1 chats
      let otherUser = null
      if (chat.type === '1:1') {
        // Get the user_id that's not the current user
        const otherMemberId = chatMembersWithUsers?.find(m => m.user_id !== userId)?.user_id
        
        if (otherMemberId) {
          // Fetch the user data directly
          const { data: otherUserData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', otherMemberId)
            .single()
          
          if (!userError && otherUserData) {
            otherUser = otherUserData
          }
        }
      }

      chats.push({
        ...chat,
        members: chatMembersWithUsers || [],
        otherUser: otherUser,
        last_message: lastMessage as any,
        unread_count: unreadCount,
      })
    }

    return chats.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at
      const bTime = b.last_message?.created_at || b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })
  }

  static async getChat(chatId: string, userId: string): Promise<ChatWithDetails | null> {
    // Verify user is a member of the chat
    const { data: membership, error: membershipError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) return null

    // Get chat details
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()

    if (chatError || !chat) return null

    // Get members with user details
    const { data: members, error: membersError } = await supabase
      .from('chat_members')
      .select(`
        *,
        user:users(*)
      `)
      .eq('chat_id', chatId)

    if (membersError) throw membersError

    // Get last message
    const { data: lastMessages, error: messageError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users(*)
      `)
      .eq('chat_id', chatId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(1)

    if (messageError) {
      console.warn('Error fetching last message for chat:', chatId, messageError)
      // Don't throw, just continue without last message
    }

    const lastMessage = lastMessages && lastMessages.length > 0 ? lastMessages[0] : null

    // Get unread count
    const { data: lastRead, error: readError } = await supabase
      .from('chat_members')
      .select('last_read_at')
      .eq('chat_id', chatId)
      .eq('user_id', userId)
      .single()

    let unreadCount = 0
    if (lastRead?.last_read_at) {
      const { count, error: countError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('chat_id', chatId)
        .neq('sender_id', userId)
        .eq('is_deleted', false)
        .gt('created_at', lastRead.last_read_at)

      if (countError) throw countError
      unreadCount = count || 0
    }

    // Find the other user for 1:1 chats
    let otherUser = null
    if (chat.type === '1:1') {
      // Get the user_id that's not the current user
      const otherMemberId = members?.find(m => m.user_id !== userId)?.user_id
      
      if (otherMemberId) {
        // Fetch the user data directly
        const { data: otherUserData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', otherMemberId)
          .single()
        
        if (!userError && otherUserData) {
          otherUser = otherUserData
        }
      }
    }

    return {
      ...chat,
      members: members || [],
      otherUser: otherUser,
      last_message: lastMessage as any,
      unread_count: unreadCount,
    }
  }

  static async createChat(data: InsertChat, memberIds: string[]): Promise<Chat> {
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert(data)
      .select()
      .single()

    if (chatError || !chat) throw chatError

    // Add creator as admin
    const chatMembers: InsertChatMember[] = [
      {
        chat_id: chat.id,
        user_id: data.created_by!,
        role: 'admin',
      },
      // Add other members
      ...memberIds.map(userId => ({
        chat_id: chat.id,
        user_id: userId,
        role: 'member' as const,
      })),
    ]

    const { error: membersError } = await supabase
      .from('chat_members')
      .insert(chatMembers)

    if (membersError) throw membersError

    return chat
  }

  static async addMember(chatId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_members')
      .insert({
        chat_id: chatId,
        user_id: userId,
        role: 'member',
      })

    if (error) throw error
  }

  static async removeMember(chatId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_members')
      .delete()
      .eq('chat_id', chatId)
      .eq('user_id', userId)

    if (error) throw error
  }

  static async updateChat(chatId: string, updates: UpdateChat): Promise<void> {
    const { error } = await supabase
      .from('chats')
      .update(updates)
      .eq('id', chatId)

    if (error) throw error
  }

  static async markAsRead(chatId: string, userId: string, messageId?: string): Promise<void> {
    const updateData: any = {
      last_read_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('chat_members')
      .update(updateData)
      .eq('chat_id', chatId)
      .eq('user_id', userId)

    if (error) throw error

    // Mark specific message as read if provided
    if (messageId) {
      await supabase
        .from('message_reads')
        .upsert({
          message_id: messageId,
          user_id: userId,
        })
    }
  }

  static async createChatWithUser(currentUserId: string, otherUserId: string): Promise<ChatWithDetails> {
    // Check if a 1:1 chat already exists between these users
    // First get all chat IDs for the current user
    const { data: userChats, error: checkError } = await supabase
      .from('chat_members')
      .select('chat_id')
      .eq('user_id', currentUserId)

    if (checkError) throw checkError

    // Check each chat to see if it's a 1:1 chat with the other user
    for (const userChat of userChats || []) {
      try {
        // Get the chat details
        const { data: chat, error: chatError } = await supabase
          .from('chats')
          .select('*')
          .eq('id', userChat.chat_id)
          .single()

        if (chatError || !chat) continue

        if (chat.type === '1:1') {
          // Check if the other user is also a member
          const { data: otherMember, error: memberError } = await supabase
            .from('chat_members')
            .select('user_id')
            .eq('chat_id', chat.id)
            .eq('user_id', otherUserId)
            .single()

          if (!memberError && otherMember) {
            // Chat already exists, return it
            return await this.getChat(chat.id, currentUserId) as ChatWithDetails
          }
        }
      } catch (error) {
        console.warn('Error checking existing chat:', error)
        continue
      }
    }

    // Create new 1:1 chat
    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert({
        type: '1:1',
        name: null,
        description: null,
        avatar: null,
        created_by: currentUserId
      })
      .select()
      .single()

    if (chatError) throw chatError

    // Add both users as members
    const { error: membersError } = await supabase
      .from('chat_members')
      .insert([
        {
          chat_id: newChat.id,
          user_id: currentUserId
        },
        {
          chat_id: newChat.id,
          user_id: otherUserId
        }
      ])

    if (membersError) {
      console.error('Error adding chat members:', membersError)
      throw membersError
    }

    // Return the new chat with details
    return await this.getChat(newChat.id, currentUserId) as ChatWithDetails
  }
}
