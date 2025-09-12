-- Fix chat_members INSERT policy to allow adding members to chats
-- The current policy might be too restrictive for adding members

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can join chats" ON chat_members;

-- Create a more permissive INSERT policy for chat members
CREATE POLICY "Users can join chats" ON chat_members FOR INSERT 
WITH CHECK (
  -- Allow if user_id matches the current user's ID from our users table
  user_id IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR
  -- Allow if no auth (for system operations)
  auth.uid() IS NULL OR
  -- Allow if user_id is NULL (for system operations)
  user_id IS NULL OR
  -- Allow if the user is already a member of the chat (for adding other users)
  chat_id IN (
    SELECT chat_id FROM chat_members 
    WHERE user_id IN (
      SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
    )
  )
);
