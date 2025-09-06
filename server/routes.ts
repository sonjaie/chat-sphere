import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertReactionSchema, insertChatSchema, insertStorySchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time messaging
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth' && message.userId) {
          clients.set(message.userId, ws);
          await storage.updateUserStatus(message.userId, 'online');
          
          // Broadcast user status update
          broadcastToAll({
            type: 'user_status',
            userId: message.userId,
            status: 'online'
          });
        }
        
        if (message.type === 'typing' && message.chatId && message.userId) {
          // Broadcast typing indicator to chat members
          const chat = await storage.getChat(message.chatId);
          if (chat) {
            chat.members.forEach(memberId => {
              if (memberId !== message.userId && clients.has(memberId)) {
                const memberWs = clients.get(memberId);
                if (memberWs && memberWs.readyState === WebSocket.OPEN) {
                  memberWs.send(JSON.stringify({
                    type: 'typing',
                    chatId: message.chatId,
                    userId: message.userId,
                    isTyping: message.isTyping
                  }));
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      // Find and remove user from clients
      let userIdToRemove: string | null = null;
      clients.forEach((clientWs, userId) => {
        if (clientWs === ws) {
          userIdToRemove = userId;
        }
      });
      
      if (userIdToRemove) {
        clients.delete(userIdToRemove);
        storage.updateUserStatus(userIdToRemove, 'offline');
        
        // Broadcast user status update
        broadcastToAll({
          type: 'user_status',
          userId: userIdToRemove,
          status: 'offline'
        });
      }
    });
  });

  function broadcastToAll(message: any) {
    clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  function broadcastToChat(chatId: string, message: any, excludeUserId?: string) {
    storage.getChat(chatId).then(chat => {
      if (chat) {
        chat.members.forEach(memberId => {
          if (memberId !== excludeUserId && clients.has(memberId)) {
            const ws = clients.get(memberId);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(message));
            }
          }
        });
      }
    });
  }

  // API Routes

  // Get current user (mock authentication)
  app.get('/api/user/current', async (req, res) => {
    // In a real app, this would get the user from session/token
    const user = await storage.getUser('1'); // Sarah Johnson
    res.json(user);
  });

  // Get all users
  app.get('/api/users', async (req, res) => {
    const users = await storage.getAllUsers();
    res.json(users);
  });

  // Get user chats
  app.get('/api/chats', async (req, res) => {
    const userId = '1'; // In a real app, get from auth
    const chats = await storage.getChatsByUser(userId);
    res.json(chats);
  });

  // Create new chat
  app.post('/api/chats', async (req, res) => {
    try {
      const data = insertChatSchema.parse(req.body);
      const chat = await storage.createChat(data);
      res.json(chat);
    } catch (error) {
      res.status(400).json({ error: 'Invalid chat data' });
    }
  });

  // Get chat messages
  app.get('/api/chats/:chatId/messages', async (req, res) => {
    const { chatId } = req.params;
    const messages = await storage.getMessagesByChat(chatId);
    res.json(messages);
  });

  // Send message
  app.post('/api/chats/:chatId/messages', async (req, res) => {
    try {
      const { chatId } = req.params;
      const data = insertMessageSchema.parse({
        ...req.body,
        chatId
      });
      
      const message = await storage.createMessage(data);
      const messageWithReactions = await storage.getMessagesByChat(chatId);
      const newMessage = messageWithReactions.find(m => m.id === message.id);
      
      if (newMessage) {
        // Broadcast new message to chat members
        broadcastToChat(chatId, {
          type: 'new_message',
          message: newMessage
        }, data.senderId);
      }
      
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: 'Invalid message data' });
    }
  });

  // Mark message as read
  app.post('/api/messages/:messageId/read', async (req, res) => {
    const { messageId } = req.params;
    const { userId } = req.body;
    
    await storage.markMessageAsRead(messageId, userId);
    
    // Broadcast read receipt
    const message = await storage.getMessage(messageId);
    if (message) {
      broadcastToChat(message.chatId, {
        type: 'message_read',
        messageId,
        userId
      }, userId);
    }
    
    res.json({ success: true });
  });

  // Add reaction to message
  app.post('/api/messages/:messageId/reactions', async (req, res) => {
    try {
      const { messageId } = req.params;
      const data = insertReactionSchema.parse({
        ...req.body,
        messageId
      });
      
      // Remove existing reaction from this user
      await storage.removeReaction(messageId, data.userId);
      
      // Add new reaction
      const reaction = await storage.addReaction(data);
      
      // Broadcast reaction update
      const message = await storage.getMessage(messageId);
      if (message) {
        const reactions = await storage.getReactionsByMessage(messageId);
        broadcastToChat(message.chatId, {
          type: 'reaction_updated',
          messageId,
          reactions
        });
      }
      
      res.json(reaction);
    } catch (error) {
      res.status(400).json({ error: 'Invalid reaction data' });
    }
  });

  // Remove reaction
  app.delete('/api/messages/:messageId/reactions', async (req, res) => {
    const { messageId } = req.params;
    const { userId } = req.body;
    
    await storage.removeReaction(messageId, userId);
    
    // Broadcast reaction update
    const message = await storage.getMessage(messageId);
    if (message) {
      const reactions = await storage.getReactionsByMessage(messageId);
      broadcastToChat(message.chatId, {
        type: 'reaction_updated',
        messageId,
        reactions
      });
    }
    
    res.json({ success: true });
  });

  // Get active stories
  app.get('/api/stories', async (req, res) => {
    const stories = await storage.getActiveStories();
    res.json(stories);
  });

  // Create story
  app.post('/api/stories', async (req, res) => {
    try {
      const data = insertStorySchema.parse(req.body);
      const story = await storage.createStory(data);
      
      // Broadcast new story
      broadcastToAll({
        type: 'new_story',
        storyId: story.id
      });
      
      res.json(story);
    } catch (error) {
      res.status(400).json({ error: 'Invalid story data' });
    }
  });

  // View story
  app.post('/api/stories/:storyId/view', async (req, res) => {
    const { storyId } = req.params;
    const { userId } = req.body;
    
    await storage.addStoryViewer(storyId, userId);
    res.json({ success: true });
  });

  // Add user to chat
  app.post('/api/chats/:chatId/members', async (req, res) => {
    const { chatId } = req.params;
    const { userId } = req.body;
    
    await storage.addUserToChat(chatId, userId);
    
    // Broadcast member added
    broadcastToChat(chatId, {
      type: 'member_added',
      chatId,
      userId
    });
    
    res.json({ success: true });
  });

  // Remove user from chat
  app.delete('/api/chats/:chatId/members/:userId', async (req, res) => {
    const { chatId, userId } = req.params;
    
    await storage.removeUserFromChat(chatId, userId);
    
    // Broadcast member removed
    broadcastToChat(chatId, {
      type: 'member_removed',
      chatId,
      userId
    });
    
    res.json({ success: true });
  });

  return httpServer;
}
