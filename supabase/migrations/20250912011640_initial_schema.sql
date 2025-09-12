-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    password VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'away')),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    remember_token VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chats table
CREATE TABLE chats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(10) DEFAULT '1:1' CHECK (type IN ('1:1', 'group')),
    name VARCHAR(255), -- Only for groups
    description TEXT, -- Optional group description
    avatar TEXT, -- Optional group avatar
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_members table
CREATE TABLE chat_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL, -- For message replies
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'video', 'audio')),
    metadata JSONB, -- For storing file info, etc.
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create message_reads table
CREATE TABLE message_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Create reactions table
CREATE TABLE reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Create stories table
CREATE TABLE stories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL, -- URL to image/video
    caption TEXT,
    expiry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create story_views table
CREATE TABLE story_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(story_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX idx_messages_chat_created ON messages(chat_id, created_at);
CREATE INDEX idx_chat_members_user_id ON chat_members(user_id);
CREATE INDEX idx_chat_members_chat_id ON chat_members(chat_id);
CREATE INDEX idx_message_reads_user_id ON message_reads(user_id);
CREATE INDEX idx_reactions_message_id ON reactions(message_id);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_expiry_time ON stories(expiry_time);
CREATE INDEX idx_story_views_story_id ON story_views(story_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_members_updated_at BEFORE UPDATE ON chat_members FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stories_updated_at BEFORE UPDATE ON stories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own profile and profiles of users they chat with
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Chat members can view chats they belong to
CREATE POLICY "Chat members can view their chats" ON chats FOR SELECT 
USING (id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

-- Only chat creators can create chats
CREATE POLICY "Users can create chats" ON chats FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Chat members can view chat members
CREATE POLICY "Chat members can view chat members" ON chat_members FOR SELECT 
USING (user_id = auth.uid() OR chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

-- Users can join chats (this would typically be through an invitation system)
CREATE POLICY "Users can join chats" ON chat_members FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Chat members can view messages in their chats
CREATE POLICY "Chat members can view messages" ON messages FOR SELECT 
USING (chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

-- Users can send messages to chats they belong to
CREATE POLICY "Chat members can send messages" ON messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND 
           chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE 
USING (auth.uid() = sender_id);

-- Users can mark messages as read
CREATE POLICY "Users can mark messages as read" ON message_reads FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view message reads for messages in their chats
CREATE POLICY "Users can view message reads" ON message_reads FOR SELECT 
USING (message_id IN (SELECT id FROM messages WHERE chat_id IN 
       (SELECT chat_id FROM chat_members WHERE user_id = auth.uid())));

-- Users can add reactions to messages in their chats
CREATE POLICY "Chat members can add reactions" ON reactions FOR INSERT 
WITH CHECK (auth.uid() = user_id AND 
           message_id IN (SELECT id FROM messages WHERE chat_id IN 
           (SELECT chat_id FROM chat_members WHERE user_id = auth.uid())));

-- Users can view reactions for messages in their chats
CREATE POLICY "Chat members can view reactions" ON reactions FOR SELECT 
USING (message_id IN (SELECT id FROM messages WHERE chat_id IN 
       (SELECT chat_id FROM chat_members WHERE user_id = auth.uid())));

-- Users can create stories
CREATE POLICY "Users can create stories" ON stories FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view stories from users they follow (simplified - view all for now)
CREATE POLICY "Users can view stories" ON stories FOR SELECT 
USING (expiry_time > NOW());

-- Users can view story views for stories they created
CREATE POLICY "Users can view story views" ON story_views FOR SELECT 
USING (story_id IN (SELECT id FROM stories WHERE user_id = auth.uid()));

-- Users can mark stories as viewed
CREATE POLICY "Users can mark stories as viewed" ON story_views FOR INSERT 
WITH CHECK (auth.uid() = user_id);
