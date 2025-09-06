import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MessageBubble from "./message-bubble";
import EmojiPicker from "./emoji-picker";
import { apiRequest } from "@/lib/queryClient";
import type { ChatWithLastMessage, MessageWithReactions, User } from "@shared/schema";
import { ArrowLeft, Phone, Video, Info, Plus, Send, Smile } from "lucide-react";

interface ChatAreaProps {
  activeChat: ChatWithLastMessage | null;
  messages: MessageWithReactions[];
  currentUser: User;
  onSendTyping: (isTyping: boolean) => void;
  onToggleSidebar: () => void;
}

export default function ChatArea({
  activeChat,
  messages,
  currentUser,
  onSendTyping,
  onToggleSidebar
}: ChatAreaProps) {
  const [messageText, setMessageText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeChat) throw new Error("No active chat");
      
      return apiRequest('POST', `/api/chats/${activeChat.id}/messages`, {
        senderId: currentUser.id,
        content,
        type: 'text'
      });
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

  // Handle typing indicators
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    
    if (messageText && !isTyping) {
      setIsTyping(true);
      onSendTyping(true);
    }
    
    if (messageText) {
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
        onSendTyping(false);
      }, 1000);
    } else if (isTyping) {
      setIsTyping(false);
      onSendTyping(false);
    }
    
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [messageText, isTyping, onSendTyping]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || sendMessageMutation.isPending) return;
    
    const text = messageText.trim();
    setMessageText("");
    setIsTyping(false);
    onSendTyping(false);
    
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
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden p-2"
            onClick={onToggleSidebar}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          <div className="relative">
            {activeChat.type === "group" ? (
              <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                <i className="fas fa-users text-secondary-foreground" />
              </div>
            ) : (
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarImage 
                    src={chatAvatar || ""} 
                    alt={chatName}
                  />
                  <AvatarFallback>
                    {chatName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                {activeChat.otherUser?.status === "online" && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card online-indicator" />
                )}
              </div>
            )}
          </div>
          
          <div>
            <h3 className="font-semibold" data-testid="text-chat-header-name">
              {chatName}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid="text-chat-status">
              {getStatusText()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 hover:bg-muted rounded-full"
            data-testid="button-call"
          >
            <Phone className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 hover:bg-muted rounded-full"
            data-testid="button-video"
          >
            <Video className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 hover:bg-muted rounded-full"
            data-testid="button-info"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-area" data-testid="messages-container">
        {/* Date Separator */}
        <div className="flex justify-center">
          <span className="bg-muted text-muted-foreground text-xs px-3 py-1 rounded-full">
            Today
          </span>
        </div>

        {/* Messages */}
        {messages.map((message, index) => {
          const isOwn = message.senderId === currentUser.id;
          const showAvatar = !isOwn && (
            index === 0 || 
            messages[index - 1].senderId !== message.senderId ||
            (message.timestamp?.getTime() || 0) - (messages[index - 1].timestamp?.getTime() || 0) > 5 * 60 * 1000
          );

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
        {isTyping && (
          <div className="flex items-start space-x-2">
            <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
              <AvatarImage 
                src={chatAvatar || ""} 
                alt={chatName}
              />
              <AvatarFallback>
                {chatName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="message-bubble-received px-4 py-3 rounded-2xl rounded-bl-md">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full typing-indicator" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full typing-indicator" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full typing-indicator" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-end space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2 hover:bg-muted rounded-full flex-shrink-0"
            data-testid="button-attach"
          >
            <Plus className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <div className="flex items-end bg-muted rounded-2xl px-4 py-2 min-h-[44px]">
              <textarea
                ref={textareaRef}
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 bg-transparent resize-none outline-none max-h-32 min-h-[24px]"
                rows={1}
                data-testid="input-message"
              />
              <div className="flex items-center space-x-2 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 hover:bg-background/20 rounded-full"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  data-testid="button-emoji"
                >
                  <Smile className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-10">
                <EmojiPicker 
                  onEmojiSelect={handleEmojiSelect}
                  onClose={() => setShowEmojiPicker(false)}
                  data-testid="emoji-picker"
                />
              </div>
            )}
          </div>
          
          <Button
            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 flex-shrink-0"
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
