import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MessageBubble from "./message-bubble";
import EmojiPicker from "./emoji-picker";
import { apiRequest } from "@/lib/queryClient";
import type { ChatWithLastMessage, MessageWithReactions, User } from "@shared/schema";
import type { TypingUser } from "@/lib";
import { ArrowLeft, Phone, Video, Info, Plus, Send, Smile } from "lucide-react";

interface ChatAreaProps {
  activeChat: ChatWithLastMessage | null;
  messages: MessageWithReactions[];
  currentUser: User;
  typingUsers: TypingUser[];
  onSendTyping: (isTyping: boolean) => void;
  onSendMessage: (content: string) => Promise<void>;
  onToggleSidebar: () => void;
}

export default function ChatArea({
  activeChat,
  messages,
  currentUser,
  typingUsers,
  onSendTyping,
  onSendMessage,
  onToggleSidebar
}: ChatAreaProps) {
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChat) throw new Error("No active chat");
      
      // Use the parent's send message handler
      await onSendMessage(content);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chats', activeChat?.id, 'messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/chats'] });
    }
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
    }
  }, [messageText]);

  // Typing indicators would be implemented with real-time subscriptions
  // For now, we skip this feature

  const handleSendMessage = async () => {
    if (!messageText.trim() || sendMessageMutation.isPending) return;
    
    const text = messageText.trim();
    setMessageText("");
    
    try {
      await sendMessageMutation.mutateAsync(text);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageText(value);
    
    // Send typing indicator
    if (value.trim().length > 0) {
      onSendTyping(true);
    } else {
      onSendTyping(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-comments text-2xl text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Select a conversation</h3>
          <p className="text-muted-foreground">Choose from your existing conversations or start a new one</p>
        </div>
      </div>
    );
  }

  const chatName = activeChat.type === "group" 
    ? activeChat.name || "Group Chat"
    : activeChat.otherUser?.name || "Unknown";
  
  const chatAvatar = activeChat.type === "group"
    ? null
    : activeChat.otherUser?.profilePicture;

  const getStatusText = () => {
    if (activeChat.type === "group") {
      return `${activeChat.members.length} members`;
    }
    
    if (activeChat.otherUser?.status === "online") {
      return "Active now";
    }
    
    const lastSeen = activeChat.otherUser?.lastSeen;
    if (lastSeen) {
      const hours = (Date.now() - new Date(lastSeen).getTime()) / (1000 * 60 * 60);
      if (hours < 1) {
        return "Active recently";
      } else if (hours < 24) {
        return `Last seen ${Math.floor(hours)}h ago`;
      } else {
        return `Last seen ${Math.floor(hours / 24)}d ago`;
      }
    }
    
    return "Offline";
  };

  return (
    <div className="flex-1 flex flex-col h-screen">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 md:p-5 border-b border-border bg-card">
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2 flex-shrink-0 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] md:min-h-[48px] md:min-w-[48px]"
            onClick={onToggleSidebar}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </Button>
          
          <div className="relative">
            {activeChat.type === "group" ? (
              <div className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                <i className="fas fa-users text-secondary-foreground text-sm sm:text-base md:text-lg" />
              </div>
            ) : (
              <div className="relative flex-shrink-0">
                <Avatar className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12">
                  <AvatarImage 
                    src={chatAvatar || ""} 
                    alt={chatName}
                  />
                  <AvatarFallback className="text-sm sm:text-base md:text-lg">
                    {chatName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {activeChat.otherUser?.status === "online" && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 md:w-4 md:h-4 bg-success rounded-full border-2 border-card online-indicator" />
                )}
              </div>
            )}
          </div>
          
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm sm:text-base md:text-lg truncate" data-testid="text-chat-header-name">
              {chatName}
            </h3>
            <p className="text-xs sm:text-sm md:text-sm text-muted-foreground truncate" data-testid="text-chat-status">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 sm:p-2 md:p-3 hover:bg-muted rounded-full min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] md:min-h-[48px] md:min-w-[48px]"
            data-testid="button-call"
          >
            <Phone className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 sm:p-2 md:p-3 hover:bg-muted rounded-full min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] md:min-h-[48px] md:min-w-[48px]"
            data-testid="button-video"
          >
            <Video className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 sm:p-2 md:p-3 hover:bg-muted rounded-full min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] md:min-h-[48px] md:min-w-[48px]"
            data-testid="button-info"
          >
            <Info className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 md:space-y-5 scroll-area min-h-0" data-testid="messages-container">
        {/* Date Separator */}
        <div className="flex justify-center">
          <span className="bg-muted text-muted-foreground text-xs sm:text-sm md:text-sm px-3 sm:px-4 md:px-5 py-1 sm:py-1.5 md:py-2 rounded-full">
            Today
          </span>
        </div>

        {/* Messages */}
        {messages.map((message, index) => {
          const isOwn = message.sender_id === currentUser.id;
          
          // Debug: Log message ownership
          // Show avatar for all messages when appropriate
          const showAvatar = (
            index === 0 || 
            messages[index - 1].sender_id !== message.sender_id ||
            (new Date(message.created_at || '').getTime()) - (new Date(messages[index - 1].created_at || '').getTime()) > 5 * 60 * 1000
          );

          // Debug: Log avatar display logic

          return (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={isOwn}
              showAvatar={showAvatar}
              currentUser={currentUser}
              data-testid={`message-${message.id}`}
            />
          );
        })}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span>
              {typingUsers.length === 1 
                ? `${typingUsers[0].user_id === activeChat?.otherUser?.id ? activeChat.otherUser?.name : 'Someone'} is typing...`
                : `${typingUsers.length} people are typing...`
              }
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-3 sm:p-4 border-t border-border bg-card flex-shrink-0">
        <div className="flex items-end space-x-2 sm:space-x-3 md:space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 sm:p-2 md:p-3 hover:bg-muted rounded-full flex-shrink-0 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] md:min-h-[48px] md:min-w-[48px]"
            data-testid="button-attach"
          >
            <Plus className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <div className="flex items-end bg-muted rounded-2xl px-3 sm:px-4 md:px-5 py-2 sm:py-2 md:py-3 min-h-[40px] sm:min-h-[44px] md:min-h-[48px]">
              <textarea
                ref={textareaRef}
                placeholder="Type a message..."
                value={messageText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-transparent resize-none outline-none max-h-32 min-h-[20px] sm:min-h-[24px] md:min-h-[28px] text-sm sm:text-base md:text-base"
                rows={1}
                data-testid="input-message"
              />
              <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 sm:p-1 md:p-2 hover:bg-background/20 rounded-full min-h-[32px] min-w-[32px] sm:min-h-[36px] sm:min-w-[36px] md:min-h-[40px] md:min-w-[40px]"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  data-testid="button-emoji"
                >
                  <Smile className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </Button>
              </div>
            </div>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-10 w-full max-w-[calc(100vw-2rem)] sm:max-w-[320px] md:max-w-[360px] lg:max-w-none lg:w-auto">
                <EmojiPicker 
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                  data-testid="emoji-picker"
                />
              </div>
            )}
          </div>
          
          <Button
            className="p-2 sm:p-2 md:p-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 flex-shrink-0 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] md:min-h-[48px] md:min-w-[48px]"
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            data-testid="button-send"
          >
            <Send className="w-4 h-4 sm:w-4 sm:h-4 md:w-5 md:h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
