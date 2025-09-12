-- Enable Realtime on users table so new registrations appear instantly in all clients

-- Ensure old row data is available for UPDATE/DELETE events
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- Add table to the realtime publication (idempotent: ignore if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'users'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.users';
  END IF;
END $$;
