import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User, ChatWithLastMessage, StoryWithUser } from "@shared/schema";
import { Search, Plus, Settings, LogOut } from "lucide-react";

interface SidebarProps {
  currentUser: User;
  chats: ChatWithLastMessage[];
  stories: StoryWithUser[];
  activeChat: ChatWithLastMessage | null;
  allUsers: User[];
  onChatSelect: (chat: ChatWithLastMessage) => void;
  onStorySelect: (story: StoryWithUser) => void;
  onStartChat: (user: User) => void;
  onLogout: () => void;
}

export default function Sidebar({
  currentUser,
  chats,
  stories,
  activeChat,
  allUsers,
  onChatSelect,
  onStorySelect,
  onStartChat,
  onLogout
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredChats = chats.filter(chat => {
    const chatName = chat.type === "group" 
      ? chat.name || "Group Chat"
      : chat.otherUser?.name || "Unknown";
    return chatName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter users to exclude current user and show only those without existing chats
  const availableUsers = allUsers
    .filter(user => user.id !== currentUser.id)
    .filter(user => {
      const hasExistingChat = chats.some(chat => 
        chat.type === "1:1" && 
        chat.otherUser?.id === user.id
      );
      return !hasExistingChat;
    })
    .filter(user => 
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );


  const formatTime = (date: Date | undefined) => {
    if (!date) return "";
    
    const messageDate = new Date(date);
    const now = new Date();
    const diff = now.getTime() - messageDate.getTime();
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 1) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else if (hours < 24) {
      return messageDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return "Yesterday";
    }
  };

  const getStatusIndicator = (user: User | undefined) => {
    if (!user) return null;
    
    const isOnline = user.status === "online";
    const lastSeenHours = user.lastSeen 
      ? (Date.now() - new Date(user.lastSeen).getTime()) / (1000 * 60 * 60)
      : 999;
    
    if (isOnline) {
      return <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card online-indicator" />;
    } else if (lastSeenHours < 1) {
      return <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card" />;
    }
    
    return <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-muted-foreground rounded-full border-2 border-card" />;
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* User Profile Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="w-10 h-10">
              <AvatarImage 
                src={currentUser.profilePicture || ""} 
                alt={currentUser.name}
              />
              <AvatarFallback>
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success rounded-full border-2 border-card online-indicator" />
          </div>
          <div>
            <h3 className="font-semibold text-sm" data-testid="text-current-user-name">
              {currentUser.name}
            </h3>
            <p className="text-xs text-muted-foreground">Active now</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 hover:bg-muted rounded-full"
            data-testid="button-add-chat"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 hover:bg-muted rounded-full"
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-2 hover:bg-muted rounded-full"
            onClick={onLogout}
            data-testid="button-logout"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stories Section */}
      <div className="p-4 border-b border-border">
        <h4 className="font-semibold text-sm mb-3">Stories</h4>
        <div className="flex space-x-3 overflow-x-auto pb-2">
          {/* Add Story */}
          <div className="flex-shrink-0 text-center cursor-pointer" data-testid="button-add-story">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors">
              <Plus className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs mt-1 text-muted-foreground">Add Story</p>
          </div>

          {/* User Stories */}
          {stories.map((story) => (
            <div 
              key={story.id}
              className="flex-shrink-0 text-center cursor-pointer"
              onClick={() => onStorySelect(story)}
              data-testid={`story-${story.id}`}
            >
              <div className="w-14 h-14 story-gradient rounded-full p-0.5">
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage 
                    src={story.user.profilePicture || ""} 
                    alt={story.user.name}
                  />
                  <AvatarFallback>
                    {story.user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </div>
              <p className="text-xs mt-1 truncate w-14" data-testid={`text-story-user-${story.id}`}>
                {story.user.name}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-input"
            data-testid="input-search-chats"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scroll-area">
        {/* Existing Chats */}
        {filteredChats.map((chat) => {
          const isActive = activeChat?.id === chat.id;
          const chatName = chat.type === "group" 
            ? chat.name || "Group Chat"
            : chat.otherUser?.name || "Unknown";
          const chatAvatar = chat.type === "group"
            ? null
            : chat.otherUser?.profilePicture;

          return (
            <div
              key={chat.id}
              className={`flex items-center p-4 hover:bg-muted cursor-pointer transition-colors ${
                isActive ? 'border-l-4 border-primary bg-muted/50' : ''
              }`}
              onClick={() => onChatSelect(chat)}
              data-testid={`chat-${chat.id}`}
            >
              <div className="relative flex-shrink-0">
                {chat.type === "group" ? (
                  <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center">
                    <i className="fas fa-users text-secondary-foreground" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-4 bg-muted rounded-full flex items-center justify-center border border-border">
                      <span className="text-xs font-semibold">{chat.members.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage 
                        src={chatAvatar || ""} 
                        alt={chatName}
                      />
                      <AvatarFallback>
                        {chatName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {getStatusIndicator(chat.otherUser)}
                  </div>
                )}
              </div>
              
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm truncate" data-testid={`text-chat-name-${chat.id}`}>
                    {chatName}
                  </p>
                  <span className="text-xs text-muted-foreground" data-testid={`text-chat-time-${chat.id}`}>
                    {formatTime(chat.last_message?.created_at ? new Date(chat.last_message.created_at) : undefined)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground truncate" data-testid={`text-chat-preview-${chat.id}`}>
                    {chat.last_message?.content || "No messages yet"}
                  </p>
                  <div className="flex items-center space-x-1">
                    {chat.unread_count > 0 && (
                      <span 
                        className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center"
                        data-testid={`badge-unread-${chat.id}`}
                      >
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Available Users Section */}
        {availableUsers.length > 0 && (
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Start New Conversation
            </h3>
            {availableUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center p-3 hover:bg-muted cursor-pointer transition-colors rounded-lg"
                onClick={() => onStartChat(user)}
                data-testid={`user-${user.id}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.profilePicture || undefined} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                    user.status === 'online' ? 'bg-green-500' : 
                    user.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`} />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium truncate" data-testid={`text-user-name-${user.id}`}>
                      {user.name}
                    </p>
                    <span className="text-xs text-muted-foreground" data-testid={`text-user-status-${user.id}`}>
                      {user.status === 'online' ? 'Online' : 
                       user.status === 'away' ? 'Away' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
