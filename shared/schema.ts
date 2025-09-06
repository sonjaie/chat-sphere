import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  profilePicture: text("profile_picture"),
  lastSeen: timestamp("last_seen").defaultNow().notNull(),
  status: text("status").default("offline").notNull(), // online, offline, away
});

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "1:1" or "group"
  name: text("name"), // only for groups
  members: jsonb("members").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  type: text("type").default("text").notNull(), // text, image, file
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  readBy: jsonb("read_by").$type<string[]>().default([]).notNull(),
});

export const stories = pgTable("stories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  media: text("media").notNull(), // URL to image/video
  caption: text("caption"),
  expiryTime: timestamp("expiry_time").notNull(),
  viewers: jsonb("viewers").$type<string[]>().default([]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reactions = pgTable("reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: varchar("message_id").notNull().references(() => messages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  emoji: text("emoji").notNull(),
});

export const readReceipts = pgTable("read_receipts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull().references(() => chats.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  lastMessageSeen: varchar("last_message_seen").references(() => messages.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  lastSeen: true,
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true,
  readBy: true,
});

export const insertStorySchema = createInsertSchema(stories).omit({
  id: true,
  createdAt: true,
  viewers: true,
});

export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
});

export const insertReadReceiptSchema = createInsertSchema(readReceipts).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;

export type Reaction = typeof reactions.$inferSelect;
export type InsertReaction = z.infer<typeof insertReactionSchema>;

export type ReadReceipt = typeof readReceipts.$inferSelect;
export type InsertReadReceipt = z.infer<typeof insertReadReceiptSchema>;

// Extended types for frontend
export type ChatWithLastMessage = Chat & {
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  otherUser?: User; // for 1:1 chats
};

export type MessageWithReactions = Message & {
  reactions: Reaction[];
  sender: User;
};

export type StoryWithUser = Story & {
  user: User;
};
