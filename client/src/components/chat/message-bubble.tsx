import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { MessageWithReactions, User } from "@shared/schema";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
  message: MessageWithReactions;
  isOwn: boolean;
  showAvatar: boolean;
  currentUser: User;
}

export default function MessageBubble({ 
  message, 
  isOwn, 
  showAvatar, 
  currentUser 
}: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const queryClient = useQueryClient();

  const addReactionMutation = useMutation({
    mutationFn: async (emoji: string) => {
      return apiRequest('POST', `/api/messages/${message.id}/reactions`, {
        userId: currentUser.id,
        emoji
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/chats', message.chat_id, 'messages'] 
      });
    }
  });

  const removeReactionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('DELETE', `/api/messages/${message.id}/reactions`, {
        userId: currentUser.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/chats', message.chat_id, 'messages'] 
      });
    }
  });

  const handleReactionClick = (emoji: string) => {
    const existingReaction = message.reactions.find(r => 
      r.userId === currentUser.id && r.emoji === emoji
    );

    if (existingReaction) {
      removeReactionMutation.mutate();
    } else {
      addReactionMutation.mutate(emoji);
    }
    setShowReactions(false);
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Group reactions by emoji and count
  const groupedReactions = message.reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, userIds: [] };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].userIds.push(reaction.userId);
    return acc;
  }, {} as Record<string, { count: number; userIds: string[] }>);

  const hasUserReacted = (emoji: string) => {
    return groupedReactions[emoji]?.userIds.includes(currentUser.id) || false;
  };

  const getReadStatus = () => {
    if (!isOwn) return null;
    
    if ((message.readBy || []).length > 1) { // More than just the sender
      return <CheckCheck className="w-3 h-3 text-primary" />;
    } else {
      return <Check className="w-3 h-3 text-muted-foreground" />;
    }
  };

  if (isOwn) {
    return (
      <div className="flex items-end justify-end space-x-2">
        {showAvatar && (
          <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
            <AvatarImage 
              src={currentUser.profilePicture || ""} 
              alt={currentUser.name}
            />
            <AvatarFallback>
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
        )}
        {!showAvatar && <div className="w-8" />}
        <div className="flex flex-col space-y-1 max-w-xs lg:max-w-md items-end">
          <div 
            className="message-bubble-sent text-black px-4 py-2 rounded-2xl rounded-br-md relative group cursor-pointer"
            onClick={() => setShowReactions(!showReactions)}
          >
            {message.type === "image" ? (
              <div>
                <img 
                  src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                  alt="Shared image" 
                  className="rounded-lg w-full h-auto mb-2" 
                />
                <p className="text-sm">{message.content}</p>
              </div>
            ) : (
              <p className="text-sm">{message.content}</p>
            )}
            
            {/* Quick reactions on hover */}
            {showReactions && (
              <div className="absolute bottom-full right-0 mb-2 bg-card border border-border rounded-lg shadow-lg p-2 flex space-x-1 z-10">
                {['❤️', '😂', '😮', '😢', '😡', '👍'].map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="p-1 text-lg hover:bg-muted rounded"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReactionClick(emoji);
                    }}
                    data-testid={`button-reaction-${emoji}`}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span data-testid="text-message-time">{formatTime(new Date(message.created_at || ''))}</span>
            {getReadStatus()}
          </div>
          
          {/* Reactions */}
          {Object.keys(groupedReactions).length > 0 && (
            <div className="flex items-center space-x-1 mt-1">
              {Object.entries(groupedReactions).map(([emoji, data]) => (
                <div 
                  key={emoji}
                  className={`bg-background border border-border rounded-full px-2 py-0.5 flex items-center space-x-1 text-xs cursor-pointer ${
                    hasUserReacted(emoji) ? 'border-primary bg-primary/10' : ''
                  }`}
                  onClick={() => handleReactionClick(emoji)}
                  data-testid={`reaction-${emoji}`}
                >
                  <span>{emoji}</span>
                  <span>{data.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start space-x-2">
      {showAvatar && (
        <Avatar className="w-8 h-8 flex-shrink-0 mt-1">
          <AvatarImage 
            src={message.sender.profilePicture || ""} 
            alt={message.sender.name}
          />
          <AvatarFallback>
            {message.sender.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
      )}
      {!showAvatar && <div className="w-8" />}
      
      <div className="flex flex-col space-y-1 max-w-xs lg:max-w-md">
        <div 
          className="message-bubble-received text-foreground px-4 py-2 rounded-2xl rounded-bl-md relative group cursor-pointer"
          onClick={() => setShowReactions(!showReactions)}
        >
          {message.type === "image" ? (
            <div>
              <img 
                src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                alt="Shared image" 
                className="rounded-lg w-full h-auto mb-2" 
              />
              <p className="text-sm px-2 pb-1">{message.content}</p>
            </div>
          ) : (
            <p className="text-sm">{message.content}</p>
          )}
          
          {/* Quick reactions on hover */}
          {showReactions && (
            <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-lg shadow-lg p-2 flex space-x-1 z-10">
              {['❤️', '😂', '😮', '😢', '😡', '👍'].map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="p-1 text-lg hover:bg-muted rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReactionClick(emoji);
                  }}
                  data-testid={`button-reaction-${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <span data-testid="text-message-time">{formatTime(new Date(message.created_at || ''))}</span>
        </div>
        
        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex items-center space-x-1 mt-1">
            {Object.entries(groupedReactions).map(([emoji, data]) => (
              <div 
                key={emoji}
                className={`bg-background border border-border rounded-full px-2 py-0.5 flex items-center space-x-1 text-xs cursor-pointer ${
                  hasUserReacted(emoji) ? 'border-primary bg-primary/10' : ''
                }`}
                onClick={() => handleReactionClick(emoji)}
                data-testid={`reaction-${emoji}`}
              >
                <span>{emoji}</span>
                <span>{data.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
