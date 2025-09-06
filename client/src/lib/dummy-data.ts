import type { User, ChatWithLastMessage, MessageWithReactions, StoryWithUser } from "@shared/schema";

export const dummyUsers: User[] = [
  {
    id: "1",
    name: "Sarah Johnson",
    profilePicture: "https://images.unsplash.com/photo-1494790108755-2616b04ce1a1?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(),
    status: "online"
  },
  {
    id: "2",
    name: "Alex Rodriguez",
    profilePicture: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(),
    status: "online"
  },
  {
    id: "3",
    name: "Emma Wilson",
    profilePicture: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(Date.now() - 1000 * 60 * 30),
    status: "online"
  },
  {
    id: "4",
    name: "Mike Chen",
    profilePicture: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(Date.now() - 1000 * 60 * 60),
    status: "offline"
  },
  {
    id: "5",
    name: "Lisa Park",
    profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150",
    lastSeen: new Date(Date.now() - 1000 * 60 * 60 * 24),
    status: "offline"
  }
];

export const currentUser = dummyUsers[0]; // Sarah Johnson

export const dummyStories: StoryWithUser[] = [
  {
    id: "1",
    userId: "2",
    media: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    caption: "Amazing hike today! The view was worth every step 🏔️ #adventure",
    expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 20),
    viewers: ["1"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    user: dummyUsers[1]
  },
  {
    id: "2",
    userId: "3",
    media: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    caption: "Perfect coffee moment ☕️",
    expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 18),
    viewers: [],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4),
    user: dummyUsers[2]
  },
  {
    id: "3",
    userId: "4",
    media: "https://images.unsplash.com/photo-1519904981063-b0cf448d479e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=700",
    caption: "City lights never get old ✨",
    expiryTime: new Date(Date.now() + 1000 * 60 * 60 * 16),
    viewers: ["1", "2"],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    user: dummyUsers[3]
  }
];
