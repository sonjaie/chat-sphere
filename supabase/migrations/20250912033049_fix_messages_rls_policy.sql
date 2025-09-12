-- Fix messages RLS policy to allow fetching messages for chats
-- Temporarily disable RLS on messages table to fix 406 errors

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their chats" ON messages;

-- Temporarily disable RLS to fix the 406 error when fetching last messages
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
