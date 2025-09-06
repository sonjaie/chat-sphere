import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/chat/sidebar";
import ChatArea from "@/components/chat/chat-area";
import ChatInfo from "@/components/chat/chat-info";
import StoryViewer from "@/components/chat/story-viewer";
import { useWebSocket } from "@/hooks/use-websocket";
import type { ChatWithLastMessage, MessageWithReactions, StoryWithUser, User } from "@shared/schema";

export default function MessengerPage() {
  const [activeChat, setActiveChat] = useState<ChatWithLastMessage | null>(null);
  const [selectedStory, setSelectedStory] = useState<StoryWithUser | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user/current'],
  });

  // Fetch user chats
  const { data: chats = [], refetch: refetchChats } = useQuery<ChatWithLastMessage[]>({
    queryKey: ['/api/chats'],
  });

  // Fetch active stories
  const { data: stories = [] } = useQuery<StoryWithUser[]>({
    queryKey: ['/api/stories'],
  });

  // Fetch messages for active chat
  const { data: messages = [], refetch: refetchMessages } = useQuery<MessageWithReactions[]>({
    queryKey: ['/api/chats', activeChat?.id, 'messages'],
    enabled: !!activeChat?.id,
  });

  // WebSocket connection
  const { sendMessage: sendWsMessage, lastMessage } = useWebSocket(
    currentUser?.id || null
  );

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const data = JSON.parse(lastMessage.data);
      
      switch (data.type) {
        case 'new_message':
          if (data.message.chatId === activeChat?.id) {
            refetchMessages();
          }
          refetchChats();
          break;
          
        case 'message_read':
          if (activeChat?.id && data.messageId) {
            refetchMessages();
          }
          break;
          
        case 'reaction_updated':
          if (activeChat?.id && data.messageId) {
            refetchMessages();
          }
          break;
          
        case 'typing':
          // Handle typing indicators
          break;
          
        case 'user_status':
          // Handle user status updates
          refetchChats();
          break;
          
        case 'new_story':
          // Refetch stories when new one is added
          break;
      }
    }
  }, [lastMessage, activeChat?.id, refetchMessages, refetchChats]);

  // Set default active chat
  useEffect(() => {
    if (chats.length > 0 && !activeChat) {
      setActiveChat(chats[0]);
    }
  }, [chats, activeChat]);

  const handleChatSelect = (chat: ChatWithLastMessage) => {
    setActiveChat(chat);
    setShowMobileSidebar(false);
  };

  const handleStorySelect = (story: StoryWithUser) => {
    setSelectedStory(story);
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (activeChat && sendWsMessage) {
      sendWsMessage({
        type: 'typing',
        chatId: activeChat.id,
        userId: currentUser?.id,
        isTyping
      });
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
    <div className="flex h-screen overflow-hidden bg-background">
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
          onChatSelect={handleChatSelect}
          onStorySelect={handleStorySelect}
          data-testid="sidebar"
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea
          activeChat={activeChat}
          messages={messages}
          currentUser={currentUser}
          onSendTyping={handleSendTyping}
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
