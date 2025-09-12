-- Fix chats table RLS policies to allow chat creation
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;

-- Create new policies that allow chat creation and management
CREATE POLICY "Users can view their chats" ON chats FOR SELECT 
USING (id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can create chats" ON chats FOR INSERT 
WITH CHECK (auth.uid() = created_by OR auth.uid() IS NULL);

-- Allow users to update chats they created
CREATE POLICY "Users can update their chats" ON chats FOR UPDATE 
USING (auth.uid() = created_by);

-- Fix chat_members table policies
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON chat_members;

CREATE POLICY "Users can view chat members" ON chat_members FOR SELECT 
USING (user_id = auth.uid() OR chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can join chats" ON chat_members FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Fix messages table policies
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Chat members can send messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;

CREATE POLICY "Users can view messages" ON messages FOR SELECT 
USING (sender_id = auth.uid() OR chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can send messages" ON messages FOR INSERT 
WITH CHECK (auth.uid() = sender_id AND chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

-- Allow users to update their own messages
CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE 
USING (auth.uid() = sender_id);
