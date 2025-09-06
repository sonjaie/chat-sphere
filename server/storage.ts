import { type User, type InsertUser, type Chat, type InsertChat, type Message, type InsertMessage, type Story, type InsertStory, type Reaction, type InsertReaction, type ReadReceipt, type InsertReadReceipt, type ChatWithLastMessage, type MessageWithReactions, type StoryWithUser } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByName(name: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<void>;
  getAllUsers(): Promise<User[]>;

  // Chats
  getChat(id: string): Promise<Chat | undefined>;
  getChatsByUser(userId: string): Promise<ChatWithLastMessage[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  addUserToChat(chatId: string, userId: string): Promise<void>;
  removeUserFromChat(chatId: string, userId: string): Promise<void>;

  // Messages
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByChat(chatId: string): Promise<MessageWithReactions[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: string, userId: string): Promise<void>;

  // Stories
  getStory(id: string): Promise<Story | undefined>;
  getActiveStories(): Promise<StoryWithUser[]>;
  createStory(story: InsertStory): Promise<Story>;
  addStoryViewer(storyId: string, userId: string): Promise<void>;
  
  // Reactions
  addReaction(reaction: InsertReaction): Promise<Reaction>;
  removeReaction(messageId: string, userId: string): Promise<void>;
  getReactionsByMessage(messageId: string): Promise<Reaction[]>;

  // Read Receipts
  updateReadReceipt(receipt: InsertReadReceipt): Promise<ReadReceipt>;
  getReadReceipt(chatId: string, userId: string): Promise<ReadReceipt | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private chats: Map<string, Chat> = new Map();
  private messages: Map<string, Message> = new Map();
  private stories: Map<string, Story> = new Map();
  private reactions: Map<string, Reaction> = new Map();
  private readReceipts: Map<string, ReadReceipt> = new Map();

  constructor() {
    this.initializeDummyData();
  }

  private initializeDummyData() {
    // Create users
    const sarah: User = {
      id: "1",
      name: "Sarah Johnson",
      profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b04ce1a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
      lastSeen: new Date(),
      status: "online"
    };

    const alex: User = {
      id: "2", 
      name: "Alex Rodriguez",
      profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
      lastSeen: new Date(),
      status: "online"
    };

    const emma: User = {
      id: "3",
      name: "Emma Wilson", 
      profilePicture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
      lastSeen: new Date(Date.now() - 1000 * 60 * 30),
      status: "online"
    };

    const mike: User = {
      id: "4",
      name: "Mike Chen",
      profilePicture: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150", 
      lastSeen: new Date(Date.now() - 1000 * 60 * 60),
      status: "offline"
    };

    const lisa: User = {
      id: "5",
      name: "Lisa Park",
      profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
      lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: "offline"
    };

    [sarah, alex, emma, mike, lisa].forEach(user => this.users.set(user.id, user));

    // Create chats
    const chat1: Chat = {
      id: "1",
      type: "1:1",
      name: null,
      members: ["1", "2"],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24)
    };

    const chat2: Chat = {
      id: "2", 
      type: "1:1",
      name: null,
      members: ["1", "3"],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48)
    };

    const chat3: Chat = {
      id: "3",
      type: "group",
      name: "Design Team",
      members: ["1", "2", "3", "4", "5"],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72)
    };

    [chat1, chat2, chat3].forEach(chat => this.chats.set(chat.id, chat));

    // Create messages
    const messages = [
      {
        id: "1",
        chatId: "1", 
        senderId: "2",
        content: "Hey Sarah! How's your day going?",
        type: "text",
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        readBy: ["1"]
      },
      {
        id: "2",
        chatId: "1",
        senderId: "1", 
        content: "Pretty good! Just finished a big project. How about you?",
        type: "text",
        timestamp: new Date(Date.now() - 1000 * 60 * 4),
        readBy: ["2"]
      },
      {
        id: "3",
        chatId: "1",
        senderId: "2",
        content: "Just got back from this amazing hike!",
        type: "image", 
        timestamp: new Date(Date.now() - 1000 * 60 * 2),
        readBy: ["1"]
      },
      {
        id: "4",
        chatId: "1",
        senderId: "1",
        content: "Wow! That view is absolutely stunning! 🏔️",
        type: "text",
        timestamp: new Date(Date.now() - 1000 * 60 * 1),
        readBy: ["2"]
      },
      {
        id: "5",
        chatId: "1", 
        senderId: "2",
        content: "I know right! We should plan a hiking trip together sometime",
        type: "text",
        timestamp: new Date(Date.now() - 1000 * 30),
        readBy: []
      },
      {
        id: "6",
        chatId: "1",
        senderId: "1",
        content: "That sounds great! Let's do it 🎉", 
        type: "text",
        timestamp: new Date(),
        readBy: []
      }
    ];

    messages.forEach(msg => this.messages.set(msg.id, msg as Message));

    // Create stories
    const story1: Story = {
      id: "1",
      userId: "2",
      media: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
      caption: "Amazing hike today! The view was worth every step 🏔️ #adventure",
      expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 20),
      viewers: ["1"],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2)
    };

    const story2: Story = {
      id: "2", 
      userId: "3",
      media: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
      caption: "Perfect coffee moment ☕️",
      expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 18),
      viewers: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4)
    };

    [story1, story2].forEach(story => this.stories.set(story.id, story));

    // Create reactions
    const reaction1: Reaction = {
      id: "1",
      messageId: "3",
      userId: "1", 
      emoji: "😍"
    };

    this.reactions.set(reaction1.id, reaction1);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByName(name: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.name === name);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      lastSeen: new Date(),
      status: insertUser.status || "offline",
      profilePicture: insertUser.profilePicture || null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStatus(id: string, status: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.status = status;
      user.lastSeen = new Date();
      this.users.set(id, user);
    }
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getChat(id: string): Promise<Chat | undefined> {
    return this.chats.get(id);
  }

  async getChatsByUser(userId: string): Promise<ChatWithLastMessage[]> {
    const userChats = Array.from(this.chats.values())
      .filter(chat => chat.members.includes(userId));

    const chatsWithLastMessage: ChatWithLastMessage[] = [];

    for (const chat of userChats) {
      const chatMessages = Array.from(this.messages.values())
        .filter(msg => msg.chatId === chat.id)
        .sort((a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0));

      const lastMessage = chatMessages[0];
      const unreadCount = chatMessages.filter(msg => 
        msg.senderId !== userId && !(msg.readBy || []).includes(userId)
      ).length;

      let otherUser: User | undefined;
      if (chat.type === "1:1") {
        const otherUserId = chat.members.find(id => id !== userId);
        if (otherUserId) {
          otherUser = this.users.get(otherUserId);
        }
      }

      chatsWithLastMessage.push({
        ...chat,
        lastMessage: lastMessage?.content,
        lastMessageTime: lastMessage?.timestamp || undefined,
        unreadCount,
        otherUser
      });
    }

    return chatsWithLastMessage.sort((a, b) => {
      const aTime = a.lastMessageTime?.getTime() || 0;
      const bTime = b.lastMessageTime?.getTime() || 0;
      return bTime - aTime;
    });
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = randomUUID();
    const chat: Chat = {
      ...insertChat,
      id,
      createdAt: new Date(),
      name: insertChat.name || null,
      members: [...insertChat.members] as string[]
    };
    this.chats.set(id, chat);
    return chat;
  }

  async addUserToChat(chatId: string, userId: string): Promise<void> {
    const chat = this.chats.get(chatId);
    if (chat && !chat.members.includes(userId)) {
      chat.members.push(userId);
      this.chats.set(chatId, chat);
    }
  }

  async removeUserFromChat(chatId: string, userId: string): Promise<void> {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.members = chat.members.filter(id => id !== userId);
      this.chats.set(chatId, chat);
    }
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByChat(chatId: string): Promise<MessageWithReactions[]> {
    const chatMessages = Array.from(this.messages.values())
      .filter(msg => msg.chatId === chatId)
      .sort((a, b) => (a.timestamp?.getTime() || 0) - (b.timestamp?.getTime() || 0));

    const messagesWithReactions: MessageWithReactions[] = [];
    
    for (const message of chatMessages) {
      const reactions = Array.from(this.reactions.values())
        .filter(reaction => reaction.messageId === message.id);
      
      const sender = this.users.get(message.senderId);
      
      if (sender) {
        messagesWithReactions.push({
          ...message,
          reactions,
          sender
        });
      }
    }

    return messagesWithReactions;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: new Date(),
      readBy: [],
      type: insertMessage.type || "text"
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessageAsRead(messageId: string, userId: string): Promise<void> {
    const message = this.messages.get(messageId);
    if (message && !(message.readBy || []).includes(userId)) {
      const readBy = message.readBy || [];
      readBy.push(userId);
      message.readBy = readBy;
      this.messages.set(messageId, message);
    }
  }

  async getStory(id: string): Promise<Story | undefined> {
    return this.stories.get(id);
  }

  async getActiveStories(): Promise<StoryWithUser[]> {
    const now = new Date();
    const activeStories = Array.from(this.stories.values())
      .filter(story => new Date(story.expiryTime) > now)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    const storiesWithUser: StoryWithUser[] = [];
    
    for (const story of activeStories) {
      const user = this.users.get(story.userId);
      if (user) {
        storiesWithUser.push({
          ...story,
          user
        });
      }
    }

    return storiesWithUser;
  }

  async createStory(insertStory: InsertStory): Promise<Story> {
    const id = randomUUID();
    const story: Story = {
      ...insertStory,
      id,
      createdAt: new Date(),
      viewers: [],
      caption: insertStory.caption || null
    };
    this.stories.set(id, story);
    return story;
  }

  async addStoryViewer(storyId: string, userId: string): Promise<void> {
    const story = this.stories.get(storyId);
    if (story && !(story.viewers || []).includes(userId)) {
      const viewers = story.viewers || [];
      viewers.push(userId);
      story.viewers = viewers;
      this.stories.set(storyId, story);
    }
  }

  async addReaction(insertReaction: InsertReaction): Promise<Reaction> {
    const id = randomUUID();
    const reaction: Reaction = {
      ...insertReaction,
      id
    };
    this.reactions.set(id, reaction);
    return reaction;
  }

  async removeReaction(messageId: string, userId: string): Promise<void> {
    const reactions = Array.from(this.reactions.entries());
    for (const [id, reaction] of reactions) {
      if (reaction.messageId === messageId && reaction.userId === userId) {
        this.reactions.delete(id);
        break;
      }
    }
  }

  async getReactionsByMessage(messageId: string): Promise<Reaction[]> {
    return Array.from(this.reactions.values())
      .filter(reaction => reaction.messageId === messageId);
  }

  async updateReadReceipt(insertReceipt: InsertReadReceipt): Promise<ReadReceipt> {
    const key = `${insertReceipt.chatId}-${insertReceipt.userId}`;
    const existing = this.readReceipts.get(key);
    
    const receipt: ReadReceipt = {
      id: existing?.id || randomUUID(),
      ...insertReceipt,
      timestamp: new Date(),
      lastMessageSeen: insertReceipt.lastMessageSeen || null
    };
    
    this.readReceipts.set(key, receipt);
    return receipt;
  }

  async getReadReceipt(chatId: string, userId: string): Promise<ReadReceipt | undefined> {
    const key = `${chatId}-${userId}`;
    return this.readReceipts.get(key);
  }
}

export const storage = new MemStorage();
