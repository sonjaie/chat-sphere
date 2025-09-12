-- Fix users table RLS policies to allow user creation
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create new policies that allow user creation and management
CREATE POLICY "Users can view their own profile" ON users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users FOR UPDATE 
USING (auth.uid() = id);

-- Allow users to insert their own profile (for signup)
CREATE POLICY "Users can create their own profile" ON users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Allow users to view profiles of other users (for chat functionality)
CREATE POLICY "Users can view other user profiles" ON users FOR SELECT 
USING (true);
