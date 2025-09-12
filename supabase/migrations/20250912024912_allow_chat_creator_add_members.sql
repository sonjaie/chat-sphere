-- Allow chat creators to add members to their chats
-- This is needed for the createChatWithUser functionality

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can join chats" ON chat_members;

-- Create a policy that allows:
-- 1. Users to add themselves to chats
-- 2. Chat creators to add other users to their chats
CREATE POLICY "Users can join chats" ON chat_members FOR INSERT 
WITH CHECK (
  -- Allow if user_id matches the current user's ID
  user_id IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR
  -- Allow if the current user created the chat
  chat_id IN (
    SELECT id FROM chats 
    WHERE created_by IN (
      SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
    )
  ) OR
  -- Allow if no auth (for system operations)
  auth.uid() IS NULL
);
