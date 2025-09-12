-- Fix chats INSERT policy to allow chat creation
-- The current policy is too restrictive for chat creation

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create chats" ON chats;

-- Create a more permissive INSERT policy
-- Allow users to create chats if they are authenticated
CREATE POLICY "Users can create chats" ON chats FOR INSERT 
WITH CHECK (
  -- Allow if created_by matches the current user's ID from our users table
  created_by IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR
  -- Allow if no auth (for system operations)
  auth.uid() IS NULL OR
  -- Allow if created_by is NULL (for system operations)
  created_by IS NULL
);

-- Also ensure the SELECT policy is working
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

CREATE POLICY "Users can view their chats" ON chats FOR SELECT 
USING (
  -- Allow if user is a member of the chat
  id IN (
    SELECT chat_id FROM chat_members 
    WHERE user_id IN (
      SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
    )
  ) OR
  -- Allow if no auth (for system operations)
  auth.uid() IS NULL OR
  -- Allow if created_by matches current user
  created_by IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  )
);
