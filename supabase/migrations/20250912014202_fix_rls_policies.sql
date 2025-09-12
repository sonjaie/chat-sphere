-- Fix RLS policies to prevent infinite recursion
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Chat members can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Chat members can view their chats" ON chats;
DROP POLICY IF EXISTS "Chat members can view messages" ON messages;
DROP POLICY IF EXISTS "Chat members can view message reads" ON message_reads;
DROP POLICY IF EXISTS "Chat members can add reactions" ON reactions;
DROP POLICY IF EXISTS "Chat members can view reactions" ON reactions;

-- Create simplified, non-recursive policies

-- Chat members can view chat members (simplified)
CREATE POLICY "Users can view chat members" ON chat_members FOR SELECT 
USING (user_id = auth.uid());

-- Chat members can view their chats (simplified)
CREATE POLICY "Users can view their chats" ON chats FOR SELECT 
USING (id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

-- Chat members can view messages (simplified)
CREATE POLICY "Users can view messages" ON messages FOR SELECT 
USING (sender_id = auth.uid() OR chat_id IN (SELECT chat_id FROM chat_members WHERE user_id = auth.uid()));

-- Users can view message reads (simplified) - drop first if exists
DROP POLICY IF EXISTS "Users can view message reads" ON message_reads;
CREATE POLICY "Users can view message reads" ON message_reads FOR SELECT 
USING (user_id = auth.uid());

-- Users can add reactions (simplified) - drop first if exists
DROP POLICY IF EXISTS "Users can add reactions" ON reactions;
CREATE POLICY "Users can add reactions" ON reactions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can view reactions (simplified) - drop first if exists
DROP POLICY IF EXISTS "Users can view reactions" ON reactions;
CREATE POLICY "Users can view reactions" ON reactions FOR SELECT 
USING (user_id = auth.uid());
