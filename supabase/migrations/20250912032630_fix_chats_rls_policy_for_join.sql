-- Fix chats RLS policy to allow users to see chats they are members of
-- The current policy might be blocking the join with chat_members

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

-- Create new policy that allows users to see chats they are members of
CREATE POLICY "Users can view their chats" ON chats FOR SELECT 
USING (
  -- Allow if user is a member of this chat
  id IN (
    SELECT chat_id FROM chat_members 
    WHERE user_id IN (
      SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
    )
  ) OR
  -- Allow if user created this chat
  created_by IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR
  -- Allow if no auth (for system operations)
  auth.uid() IS NULL
);
