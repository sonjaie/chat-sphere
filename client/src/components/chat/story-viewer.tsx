import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import type { StoryWithUser } from "@shared/schema";
import { X, ChevronLeft, ChevronRight, Heart, Send } from "lucide-react";

interface StoryViewerProps {
  story: StoryWithUser;
  onClose: () => void;
}

export default function StoryViewer({ story, onClose }: StoryViewerProps) {
  const [replyText, setReplyText] = useState("");
  const [progress, setProgress] = useState(0);

  // Mark story as viewed
  const viewStoryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/stories/${story.id}/view`, {
        userId: '1' // In real app, get from current user
      });
    }
  });

  // Auto-close story after viewing duration
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          onClose();
          return 100;
        }
        return prev + 1;
      });
    }, 50); // 5 seconds total

    // Mark as viewed
    viewStoryMutation.mutate();

    return () => clearInterval(timer);
  }, [onClose, viewStoryMutation]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${Math.floor(hours / 24)}d ago`;
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      onKeyDown={handleKeyPress}
      tabIndex={0}
      data-testid="story-viewer-overlay"
    >
      <div 
        className="relative max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Story Progress Bar */}
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="flex space-x-1">
            <div className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Story Header */}
        <div className="absolute top-8 left-4 right-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage 
                  src={story.user.profilePicture || ""} 
                  alt={story.user.name}
                />
                <AvatarFallback>
                  {story.user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-white font-semibold text-sm" data-testid="text-story-author">
                  {story.user.name}
                </p>
                <p className="text-white/70 text-xs" data-testid="text-story-time">
                  {formatTimeAgo(new Date(story.createdAt!))}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white p-2"
              onClick={onClose}
              data-testid="button-close-story"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Story Content */}
        <img 
          src={story.media} 
          alt="Story content" 
          className="w-full h-[600px] object-cover rounded-2xl"
          data-testid="img-story-content"
        />
        
        {/* Story Caption */}
        {story.caption && (
          <div className="absolute bottom-20 left-4 right-4">
            <p className="text-white text-sm" data-testid="text-story-caption">
              {story.caption}
            </p>
          </div>
        )}
        
        {/* Story Reply */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Reply to story..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="flex-1 bg-white/20 backdrop-blur-sm text-white placeholder-white/70 border-white/30 rounded-full"
              data-testid="input-story-reply"
            />
            <Button 
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white p-2"
              data-testid="button-story-heart"
            >
              <Heart className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              className="text-white/70 hover:text-white p-2"
              data-testid="button-story-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Navigation arrows */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white p-4"
          data-testid="button-previous-story"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white p-4"
          data-testid="button-next-story"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
