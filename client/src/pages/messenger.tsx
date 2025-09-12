import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/chat/sidebar";
import ChatArea from "@/components/chat/chat-area";
import ChatInfo from "@/components/chat/chat-info";
import StoryViewer from "@/components/chat/story-viewer";
import { AuthService, ChatService, MessageService, StoryService } from "../lib";
import { supabase } from "../lib/supabase";
import type { ChatWithDetails, MessageWithDetails, StoryWithDetails, AuthUser } from "../lib";

export default function MessengerPage() {
  const [activeChat, setActiveChat] = useState<ChatWithDetails | null>(null);
  const [selectedStory, setSelectedStory] = useState<StoryWithDetails | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

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

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUser) return;

    // Subscribe to messages for active chat (skip temporary chats)
    if (activeChat && !activeChat.id.startsWith('temp-')) {
      const unsubscribeMessages = MessageService.subscribeToMessages(
        activeChat.id,
        (newMessage) => {
          refetchMessages();
        },
        (updatedMessage) => {
          refetchMessages();
        },
        (deletedMessageId) => {
          refetchMessages();
        }
      );

      return unsubscribeMessages;
    }
  }, [currentUser, activeChat, refetchMessages]);

  // Set up global message subscription for sidebar updates
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeGlobalMessages = MessageService.subscribeToAllUserMessages(
      currentUser.id,
      (newMessage) => {
        // Update chat list when any new message arrives
        refetchChats();
        // Also update messages if this is the active chat
        if (activeChat && newMessage.chat_id === activeChat.id) {
          refetchMessages();
        }
      },
      (updatedMessage) => {
        // Update chat list when any message is updated
        refetchChats();
        // Also update messages if this is the active chat
        if (activeChat && updatedMessage.chat_id === activeChat.id) {
          refetchMessages();
        }
      },
      (deletedMessageId) => {
        // Update chat list when any message is deleted
        refetchChats();
        // Also update messages if this is the active chat
        if (activeChat) {
          refetchMessages();
        }
      }
    );

    return unsubscribeGlobalMessages;
  }, [currentUser, activeChat, refetchChats, refetchMessages]);

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

  const handleSendTyping = (isTyping: boolean) => {
    // Typing indicators can be implemented with Supabase real-time
    // For now, we'll skip this feature
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
        
        // Refresh the chat list so the new chat appears in the sidebar
        console.log('Refreshing chat list...');
        await refetchChats();
        console.log('Chat list refreshed');
      } else {
        // Send message to existing chat
        await MessageService.sendMessage({
          chat_id: activeChat.id,
          sender_id: currentUser.id,
          content: content,
          type: 'text'
        });
        
        // Refresh messages for existing chat and chat list for sidebar
        refetchMessages();
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
