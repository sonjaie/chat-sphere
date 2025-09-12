-- Temporarily disable RLS on chats and chat_members to fix circular dependency
-- We'll re-enable it later with proper policies

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON chat_members;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

-- Temporarily disable RLS to fix the circular dependency issue
ALTER TABLE chat_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
