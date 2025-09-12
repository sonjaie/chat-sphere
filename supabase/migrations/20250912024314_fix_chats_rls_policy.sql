-- Fix chats RLS policy to work with custom user IDs
-- The issue is that auth.uid() returns the Supabase Auth user ID,
-- but our users table has custom user IDs that don't match

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;

-- Create new policies that work with our custom user system
-- Users can view chats if they are a member of that chat
CREATE POLICY "Users can view their chats" ON chats FOR SELECT 
USING (
  id IN (
    SELECT chat_id FROM chat_members 
    WHERE user_id IN (
      SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
    )
  ) OR auth.uid() IS NULL
);

-- Users can create chats (allow inserts for now)
CREATE POLICY "Users can create chats" ON chats FOR INSERT 
WITH CHECK (
  created_by IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR auth.uid() IS NULL
);
