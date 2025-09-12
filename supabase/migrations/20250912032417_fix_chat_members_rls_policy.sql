-- Fix chat_members RLS policy to allow users to see ALL members of chats they belong to
-- The current policy only shows memberships for the current user, but we need to see all members

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;

-- Create new policy that allows users to see ALL members of chats they are part of
CREATE POLICY "Users can view chat members" ON chat_members FOR SELECT 
USING (
  -- Allow if user is a member of this chat (can see all members of their chats)
  chat_id IN (
    SELECT chat_id FROM chat_members 
    WHERE user_id IN (
      SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
    )
  ) OR
  -- Allow if no auth (for system operations)
  auth.uid() IS NULL
);
