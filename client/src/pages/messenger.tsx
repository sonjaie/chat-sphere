import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/chat/sidebar";
import ChatArea from "@/components/chat/chat-area";
import ChatInfo from "@/components/chat/chat-info";
import StoryViewer from "@/components/chat/story-viewer";
import { AuthService, ChatService, MessageService, StoryService, TypingService } from "../lib";
import { supabase } from "../lib/supabase";
import type { ChatWithDetails, MessageWithDetails, StoryWithDetails, AuthUser, TypingUser } from "../lib";

export default function MessengerPage() {
  const [activeChat, setActiveChat] = useState<ChatWithDetails | null>(null);
  const [selectedStory, setSelectedStory] = useState<StoryWithDetails | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery<AuthUser | null>({
    queryKey: ['currentUser'],
    queryFn: AuthService.getCurrentUser,
  });

  // Fetch user chats
  const { data: chats = [], refetch: refetchChats } = useQuery<ChatWithDetails[]>({
    queryKey: ['chats', currentUser?.id],
    queryFn: () => currentUser ? ChatService.getChats(currentUser.id) : Promise.resolve([]),
    enabled: !!currentUser,
  });

  // Debug: Log chats when they change
  useEffect(() => {
    console.log('Chats updated:', chats);
    chats.forEach((chat, index) => {
      console.log(`Chat ${index}:`, {
        id: chat.id,
        type: chat.type,
        name: chat.name,
        otherUser: chat.otherUser,
        members: chat.members,
        last_message: chat.last_message
      });
    });
  }, [chats]);

  // Fetch active stories
  const { data: stories = [], refetch: refetchStories } = useQuery<StoryWithDetails[]>({
    queryKey: ['stories', currentUser?.id],
    queryFn: () => currentUser ? StoryService.getActiveStories(currentUser.id) : Promise.resolve([]),
    enabled: !!currentUser,
  });

  // Fetch all users for starting new conversations
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: AuthService.getAllUsers,
  });

  // Fetch messages for active chat
  const { data: messages = [], refetch: refetchMessages } = useQuery<MessageWithDetails[]>({
    queryKey: ['messages', activeChat?.id],
    queryFn: () => activeChat ? MessageService.getMessages(activeChat.id) : Promise.resolve([]),
    enabled: !!activeChat && !activeChat.id.startsWith('temp-'), // Skip fetching for temporary chats
  });

  // Debug: Log messages when they change
  useEffect(() => {
    console.log('Messages updated:', messages);
    messages.forEach((msg, index) => {
      console.log(`Message ${index}:`, {
        id: msg.id,
        sender_id: msg.sender_id,
        sender: msg.sender,
        content: msg.content,
        created_at: msg.created_at
      });
    });
  }, [messages]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to messages for active chat (skip temporary chats)
    if (activeChat && !activeChat.id.startsWith('temp-')) {
      console.log('Setting up real-time subscription for chat:', activeChat.id);
      
      const unsubscribeMessages = MessageService.subscribeToMessages(
        activeChat.id,
        (newMessage) => {
          console.log('New message received via real-time:', newMessage);
          // Use queryClient to update the cache directly instead of refetching
          queryClient.setQueryData(['messages', activeChat.id], (oldMessages: MessageWithDetails[] = []) => {
            // Check if message already exists to avoid duplicates
            const exists = oldMessages.some(msg => msg.id === newMessage.id);
            if (exists) return oldMessages;
            return [...oldMessages, newMessage];
          });
          // Also update the chat list to show the new message
          refetchChats();
        },
        (updatedMessage) => {
          console.log('Message updated via real-time:', updatedMessage);
          // Update the specific message in the cache
          queryClient.setQueryData(['messages', activeChat.id], (oldMessages: MessageWithDetails[] = []) => {
            return oldMessages.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            );
          });
          refetchChats();
        },
        (deletedMessageId) => {
          console.log('Message deleted via real-time:', deletedMessageId);
          // Remove the message from the cache
          queryClient.setQueryData(['messages', activeChat.id], (oldMessages: MessageWithDetails[] = []) => {
            return oldMessages.filter(msg => msg.id !== deletedMessageId);
          });
          refetchChats();
        }
      );

      return unsubscribeMessages;
    }
  }, [currentUser, activeChat, queryClient, refetchChats]);

  // Set up global message subscription for sidebar updates
  useEffect(() => {
    if (!currentUser) return;

    console.log('Setting up global message subscription for user:', currentUser.id);

    const unsubscribeGlobalMessages = MessageService.subscribeToAllUserMessages(
      currentUser.id,
      (newMessage) => {
        console.log('Global new message received:', newMessage);
        // Update chat list when any new message arrives
        refetchChats();
        // Also update messages if this is the active chat
        if (activeChat && newMessage.chat_id === activeChat.id) {
          queryClient.setQueryData(['messages', activeChat.id], (oldMessages: MessageWithDetails[] = []) => {
            const exists = oldMessages.some(msg => msg.id === newMessage.id);
            if (exists) return oldMessages;
            return [...oldMessages, newMessage];
          });
        }
      },
      (updatedMessage) => {
        console.log('Global message updated:', updatedMessage);
        // Update chat list when any message is updated
        refetchChats();
        // Also update messages if this is the active chat
        if (activeChat && updatedMessage.chat_id === activeChat.id) {
          queryClient.setQueryData(['messages', activeChat.id], (oldMessages: MessageWithDetails[] = []) => {
            return oldMessages.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            );
          });
        }
      },
      (deletedMessageId) => {
        console.log('Global message deleted:', deletedMessageId);
        // Update chat list when any message is deleted
        refetchChats();
        // Also update messages if this is the active chat
        if (activeChat) {
          queryClient.setQueryData(['messages', activeChat.id], (oldMessages: MessageWithDetails[] = []) => {
            return oldMessages.filter(msg => msg.id !== deletedMessageId);
          });
        }
      }
    );

    return unsubscribeGlobalMessages;
  }, [currentUser, activeChat, queryClient, refetchChats]);

  // Subscribe to stories
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeStories = StoryService.subscribeToStories(
      currentUser.id,
      (newStory) => {
        refetchStories();
      },
      (updatedStory) => {
        refetchStories();
      },
      (deletedStoryId) => {
        refetchStories();
      }
    );

    return unsubscribeStories;
  }, [currentUser, refetchStories]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!currentUser || !activeChat || activeChat.id.startsWith('temp-')) return;

    console.log('Setting up typing subscription for chat:', activeChat.id);

    const unsubscribeTyping = TypingService.subscribeToTyping(
      activeChat.id,
      (typingUsers) => {
        console.log('Typing users updated:', typingUsers);
        // Filter out the current user from typing indicators
        const otherTypingUsers = typingUsers.filter(user => user.user_id !== currentUser.id);
        setTypingUsers(otherTypingUsers);
      }
    );

    return unsubscribeTyping;
  }, [currentUser, activeChat]);

  // Set default active chat
  useEffect(() => {
    if (chats.length > 0 && !activeChat) {
      setActiveChat(chats[0]);
    }
  }, [chats, activeChat]);

  const handleChatSelect = (chat: ChatWithDetails) => {
    setActiveChat(chat);
    setShowMobileSidebar(false);
    
    // Mark chat as read when selected (skip temporary chats)
    if (currentUser && !chat.id.startsWith('temp-')) {
      ChatService.markAsRead(chat.id, currentUser.id);
    }
  };

  const handleStorySelect = (story: StoryWithDetails) => {
    setSelectedStory(story);
    
    // Mark story as viewed
    if (currentUser) {
      StoryService.viewStory(story.id, currentUser.id);
    }
  };

  const handleStartChat = async (otherUser: any) => {
    if (!currentUser) return;
    
    // Don't create the chat yet, just set up a temporary chat for messaging
    const tempChat: ChatWithDetails = {
      id: `temp-${otherUser.id}`,
      type: '1:1' as const,
      name: null,
      description: null,
      avatar: null,
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [],
      otherUser: otherUser,
      last_message: undefined,
      unread_count: 0,
    };
    
    console.log('Starting temporary chat with:', otherUser.name);
    setActiveChat(tempChat);
    setShowMobileSidebar(false);
  };

  const handleSendTyping = async (isTyping: boolean) => {
    if (!currentUser || !activeChat || activeChat.id.startsWith('temp-')) return;
    
    try {
      if (isTyping) {
        await TypingService.startTyping(activeChat.id, currentUser.id);
      } else {
        await TypingService.stopTyping(activeChat.id, currentUser.id);
      }
    } catch (error) {
      console.error('Failed to update typing status:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeChat || !currentUser) return;
    
    try {
      // Check if this is a temporary chat (starts with "temp-")
      if (activeChat.id.startsWith('temp-')) {
        console.log('Creating real chat for first message...');
        
        // Extract the other user ID from the temp chat ID
        const otherUserId = activeChat.id.replace('temp-', '');
        
        // Create the real chat
        const realChat = await ChatService.createChatWithUser(currentUser.id, otherUserId);
        console.log('Real chat created:', realChat);
        
        // Set the active chat to the real chat
        setActiveChat(realChat);
        
        // Now send the message to the real chat
        const messageResult = await MessageService.sendMessage({
          chat_id: realChat.id,
          sender_id: currentUser.id,
          content: content,
          type: 'text'
        });
        
        console.log('Message sent to real chat:', messageResult);
        
        // Update the cache immediately for better UX
        queryClient.setQueryData(['messages', realChat.id], (oldMessages: MessageWithDetails[] = []) => {
          const exists = oldMessages.some(msg => msg.id === messageResult.id);
          if (exists) return oldMessages;
          return [...oldMessages, messageResult];
        });
        
        // Refresh the chat list so the new chat appears in the sidebar
        console.log('Refreshing chat list...');
        await refetchChats();
        console.log('Chat list refreshed');
        
        // Also refresh messages to make sure they're loaded
        console.log('Refreshing messages...');
        await refetchMessages();
        console.log('Messages refreshed');
      } else {
        // Send message to existing chat
        const messageResult = await MessageService.sendMessage({
          chat_id: activeChat.id,
          sender_id: currentUser.id,
          content: content,
          type: 'text'
        });
        
        console.log('Message sent:', messageResult);
        
        // Update the cache immediately for better UX
        console.log('Updating cache with new message:', messageResult);
        queryClient.setQueryData(['messages', activeChat.id], (oldMessages: MessageWithDetails[] = []) => {
          const exists = oldMessages.some(msg => msg.id === messageResult.id);
          if (exists) {
            console.log('Message already exists in cache, not adding duplicate');
            return oldMessages;
          }
          console.log('Adding new message to cache');
          return [...oldMessages, messageResult];
        });
        
        // Refresh chat list for sidebar
        console.log('Refreshing chat list for existing chat...');
        refetchChats();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading messenger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-80 transform transition-transform lg:relative lg:translate-x-0 lg:z-0
        ${showMobileSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar
          currentUser={currentUser}
          chats={chats}
          stories={stories}
          activeChat={activeChat}
          allUsers={allUsers}
          onChatSelect={handleChatSelect}
          onStorySelect={handleStorySelect}
          onStartChat={handleStartChat}
          data-testid="sidebar"
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <ChatArea
          key={activeChat?.id || 'no-chat'}
          activeChat={activeChat}
          messages={messages}
          currentUser={currentUser}
          typingUsers={typingUsers}
          onSendTyping={handleSendTyping}
          onSendMessage={handleSendMessage}
          onToggleSidebar={() => setShowMobileSidebar(!showMobileSidebar)}
          data-testid="chat-area"
        />
      </div>

      {/* Chat Info Panel */}
      <div className="hidden xl:flex xl:w-80">
        <ChatInfo
          activeChat={activeChat}
          currentUser={currentUser}
          data-testid="chat-info"
        />
      </div>

      {/* Story Viewer Modal */}
      {selectedStory && (
        <StoryViewer
          story={selectedStory}
          onClose={() => setSelectedStory(null)}
          data-testid="story-viewer"
        />
      )}

      {/* Mobile Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-30">
        <div className="flex justify-around">
          <button 
            className="p-2 text-primary"
            onClick={() => setShowMobileSidebar(true)}
            data-testid="button-mobile-chats"
          >
            <i className="fas fa-comments"></i>
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-foreground"
            data-testid="button-mobile-stories"
          >
            <i className="fas fa-circle-notch"></i>
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-foreground"
            data-testid="button-mobile-groups"
          >
            <i className="fas fa-users"></i>
          </button>
          <button 
            className="p-2 text-muted-foreground hover:text-foreground"
            data-testid="button-mobile-settings"
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
