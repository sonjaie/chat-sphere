-- Fix infinite recursion in chat_members INSERT policy
-- The current policy is causing infinite recursion when trying to insert

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can join chats" ON chat_members;

-- Create a simpler INSERT policy that doesn't cause recursion
CREATE POLICY "Users can join chats" ON chat_members FOR INSERT 
WITH CHECK (
  -- Allow if user_id matches the current user's ID from our users table
  user_id IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR
  -- Allow if no auth (for system operations)
  auth.uid() IS NULL OR
  -- Allow if user_id is NULL (for system operations)
  user_id IS NULL
);
