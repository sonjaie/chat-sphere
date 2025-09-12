-- Enable Realtime on messages so new messages stream to clients without refresh

-- Ensure old row data is available for UPDATE/DELETE events
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Add table to the realtime publication (idempotent: ignore if already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;


