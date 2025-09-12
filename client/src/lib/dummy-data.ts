import type { User, ChatWithLastMessage, MessageWithReactions, StoryWithUser } from "@shared/schema";

export const dummyUsers: User[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b04ce1a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(),
    status: "online",
    email: "sarah@example.com",
    last_seen: new Date().toISOString()
  },
  {
    id: "2",
    name: "Alex Rodriguez",
    profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(),
    status: "online",
    email: "alex@example.com",
    last_seen: new Date().toISOString()
  },
  {
    id: "3",
    name: "Emma Wilson",
    profilePicture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(Date.now() - 1000 * 60 * 30),
    status: "online",
    email: "emma@example.com",
    last_seen: new Date(Date.now() - 1000 * 60 * 30).toISOString()
  },
  {
    id: "4",
    name: "Mike Chen",
    profilePicture: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(Date.now() - 1000 * 60 * 60),
    status: "offline",
    email: "mike@example.com",
    last_seen: new Date(Date.now() - 1000 * 60 * 60).toISOString()
  },
  {
    id: "5",
    name: "Lisa Park",
    profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24),
    status: "offline",
    email: "lisa@example.com",
    last_seen: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
];

export const currentUser = dummyUsers[0]; // Sarah Johnson

export const dummyStories: StoryWithUser[] = [
  {
    id: "1",
    user_id: "2",
    userId: "2",
    media_url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    media: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    content: "Amazing hike today! The view was worth every step 🏔️ #adventure",
    caption: "Amazing hike today! The view was worth every step 🏔️ #adventure",
    expiry_time: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
    expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 20),
    viewers: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    user: dummyUsers[1]
  },
  {
    id: "2",
    user_id: "3",
    userId: "3",
    media_url: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    media: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    content: "Perfect coffee moment ☕️",
    caption: "Perfect coffee moment ☕️",
    expiry_time: new Date(Date.now() + 1000 * 60 * 60 * 18).toISOString(),
    expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 18),
    viewers: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    user: dummyUsers[2]
  },
  {
    id: "3",
    user_id: "4",
    userId: "4",
    media_url: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    media: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    content: "City lights never get old ✨",
    caption: "City lights never get old ✨",
    expiry_time: new Date(Date.now() + 1000 * 60 * 60 * 16).toISOString(),
    expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 16),
    viewers: [],
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    user: dummyUsers[3]
  }
];
