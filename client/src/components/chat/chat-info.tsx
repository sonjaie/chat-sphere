import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { ChatWithLastMessage, User } from "@shared/schema";
import { Phone, Video, UserPlus, Search, Bell, EyeOff, Ban, Trash2, ChevronRight } from "lucide-react";

interface ChatInfoProps {
  activeChat: ChatWithLastMessage | null;
  currentUser: User;
}

export default function ChatInfo({ activeChat, currentUser }: ChatInfoProps) {
  if (!activeChat) {
    return (
      <div className="flex flex-col w-full bg-card border-l border-border">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Select a chat to view details</p>
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
    
    return "Offline";
  };

  // Mock shared media - in real app this would come from API
  const sharedMedia = [
    "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
    "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100"
  ];

  return (
    <div className="flex flex-col w-full bg-card border-l border-border relative">
      {/* Chat Info Header */}
      <div className="p-6 text-center border-b border-border">
        <div className="relative mx-auto mb-3 w-20 h-20">
          {activeChat.type === "group" ? (
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center">
              <i className="fas fa-users text-2xl text-secondary-foreground" />
            </div>
          ) : (
            <Avatar className="w-20 h-20">
              <AvatarImage 
                src={chatAvatar || ""} 
                alt={chatName}
              />
              <AvatarFallback className="text-xl">
                {chatName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          )}
          {activeChat.otherUser?.status === "online" && activeChat.type !== "group" && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full border-4 border-card online-indicator" />
          )}
        </div>
        <h3 className="font-semibold text-lg" data-testid="text-chat-info-name">
          {chatName}
        </h3>
        <p className="text-muted-foreground" data-testid="text-chat-info-status">
          {getStatusText()}
        </p>
      </div>

      {/* Coming Soon Overlay - covers actions and below */}
      <div className="absolute top-[180px] left-0 right-0 bottom-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚀</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
          <p className="text-muted-foreground text-sm">
            Chat details and settings will be available in a future update
          </p>
        </div>
      </div>

      {/* Chat Actions */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-4 gap-4 text-center">
          <Button 
            variant="ghost"
            className="p-3 hover:bg-muted rounded-lg flex flex-col items-center space-y-1 h-auto"
            data-testid="button-info-call"
          >
            <Phone className="w-5 h-5" />
            <span className="text-xs">Call</span>
          </Button>
          <Button 
            variant="ghost"
            className="p-3 hover:bg-muted rounded-lg flex flex-col items-center space-y-1 h-auto"
            data-testid="button-info-video"
          >
            <Video className="w-5 h-5" />
            <span className="text-xs">Video</span>
          </Button>
          <Button 
            variant="ghost"
            className="p-3 hover:bg-muted rounded-lg flex flex-col items-center space-y-1 h-auto"
            data-testid="button-info-add"
          >
            <UserPlus className="w-5 h-5" />
            <span className="text-xs">Add</span>
          </Button>
          <Button 
            variant="ghost"
            className="p-3 hover:bg-muted rounded-lg flex flex-col items-center space-y-1 h-auto"
            data-testid="button-info-search"
          >
            <Search className="w-5 h-5" />
            <span className="text-xs">Search</span>
          </Button>
        </div>
      </div>

      {/* Shared Media */}
      <div className="p-4 border-b border-border">
        <h4 className="font-semibold mb-3">Shared Photos</h4>
        <div className="grid grid-cols-3 gap-2">
          {sharedMedia.map((media, index) => (
            <img 
              key={index}
              src={media} 
              alt="Shared media" 
              className="rounded-lg object-cover w-full h-20 cursor-pointer hover:opacity-80 transition-opacity"
              data-testid={`img-shared-media-${index}`}
            />
          ))}
        </div>
        <Button 
          variant="ghost"
          className="w-full mt-3 py-2 text-primary hover:bg-muted rounded-lg"
          data-testid="button-view-all-media"
        >
          View All
        </Button>
      </div>

      {/* Chat Settings */}
      <div className="p-4 flex-1">
        <div className="space-y-3">
          <Button 
            variant="ghost"
            className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg h-auto"
            data-testid="button-notifications"
          >
            <div className="flex items-center space-x-3">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </div>
            <div className="w-8 h-4 bg-primary rounded-full relative">
              <div className="absolute right-0 top-0 w-4 h-4 bg-white rounded-full shadow-md" />
            </div>
          </Button>
          
          <Button 
            variant="ghost"
            className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg h-auto"
            data-testid="button-hide-chat"
          >
            <div className="flex items-center space-x-3">
              <EyeOff className="w-4 h-4" />
              <span>Hide Chat</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost"
            className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg h-auto"
            data-testid="button-block-user"
          >
            <div className="flex items-center space-x-3">
              <Ban className="w-4 h-4" />
              <span>Block User</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <Button 
            variant="ghost"
            className="w-full flex items-center justify-between p-3 hover:bg-muted rounded-lg text-destructive hover:text-destructive h-auto"
            data-testid="button-delete-chat"
          >
            <div className="flex items-center space-x-3">
              <Trash2 className="w-4 h-4" />
              <span>Delete Chat</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
