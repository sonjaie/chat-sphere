-- Fix chat_members RLS policy to work with custom user IDs
-- The issue is that auth.uid() returns the Supabase Auth user ID,
-- but our users table has custom user IDs that don't match

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON chat_members;

-- Create new policies that work with our custom user system
-- Users can view chat members if they are a member of that chat
CREATE POLICY "Users can view chat members" ON chat_members FOR SELECT 
USING (
  user_id IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  )
);

-- Users can join chats (allow inserts for now)
CREATE POLICY "Users can join chats" ON chat_members FOR INSERT 
WITH CHECK (
  user_id IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  ) OR auth.uid() IS NULL
);

-- Also fix messages policy to work with custom user IDs
DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their chats" ON messages;

CREATE POLICY "Users can view messages in their chats" ON messages FOR SELECT 
USING (
  chat_id IN (
    SELECT chat_id FROM chat_members 
    WHERE user_id IN (
      SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
    )
  )
);

CREATE POLICY "Users can send messages in their chats" ON messages FOR INSERT 
WITH CHECK (
  sender_id IN (
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
  ) AND chat_id IN (
    SELECT chat_id FROM chat_members 
    WHERE user_id IN (
      SELECT id FROM users WHERE email = auth.jwt() ->> 'email'
    )
  )
);
