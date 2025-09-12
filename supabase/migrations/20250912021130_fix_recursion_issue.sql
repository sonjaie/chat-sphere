-- Fix infinite recursion in chat_members policies
-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view chat members" ON chat_members;
DROP POLICY IF EXISTS "Users can join chats" ON chat_members;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view chat members" ON chat_members FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can join chats" ON chat_members FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Also fix chats policy to be simpler
DROP POLICY IF EXISTS "Users can view their chats" ON chats;

CREATE POLICY "Users can view their chats" ON chats FOR SELECT 
USING (auth.uid() = created_by OR auth.uid() IS NULL);

-- Fix messages policy to be simpler
DROP POLICY IF EXISTS "Users can view messages" ON messages;

CREATE POLICY "Users can view messages" ON messages FOR SELECT 
USING (sender_id = auth.uid() OR auth.uid() IS NULL);
