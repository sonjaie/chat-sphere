-- Fix users table INSERT policy to allow user profile creation during signup
-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create their own profile" ON users;

-- Create a more permissive INSERT policy for signup
-- This allows inserting user profiles when the authenticated user's ID matches the inserted ID
CREATE POLICY "Allow user profile creation during signup" ON users FOR INSERT 
WITH CHECK (
  -- Allow if the authenticated user's ID matches the inserted ID
  auth.uid() = id OR
  -- Allow if no user is authenticated (for initial setup)
  auth.uid() IS NULL
);
