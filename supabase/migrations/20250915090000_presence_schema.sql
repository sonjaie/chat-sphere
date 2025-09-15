-- Presence: schema for multi-device ONLINE/AWAY/OFFLINE with TTLs
-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'presence_state_enum') THEN
    CREATE TYPE presence_state_enum AS ENUM ('ONLINE', 'AWAY', 'OFFLINE');
  END IF;
END $$;

-- Aggregated presence per user
CREATE TABLE IF NOT EXISTS presence_state (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state presence_state_enum NOT NULL DEFAULT 'OFFLINE',
  last_activity_at timestamptz,
  connected_device_count integer NOT NULL DEFAULT 0,
  changed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Device connections (audit)
CREATE TABLE IF NOT EXISTS device_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  connection_status text NOT NULL CHECK (connection_status IN ('connected','disconnected')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  last_activity_at timestamptz,
  last_heartbeat_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One active record per user+device where disconnected_at is null
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_device_per_user
  ON device_connections(user_id, device_id)
  WHERE disconnected_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_device_connections_user_active
  ON device_connections(user_id)
  WHERE disconnected_at IS NULL;

-- TTL trackers
CREATE TABLE IF NOT EXISTS presence_activity_ttl (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS presence_away_ttl (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS presence_disconnect_grace (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);

-- Updated_at triggers
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_presence_state_updated_at'
  ) THEN
    CREATE TRIGGER trg_presence_state_updated_at
    BEFORE UPDATE ON presence_state
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_device_connections_updated_at'
  ) THEN
    CREATE TRIGGER trg_device_connections_updated_at
    BEFORE UPDATE ON device_connections
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
  END IF;
END $$;

-- RLS: Enable and allow authenticated users to read presence_state only
ALTER TABLE presence_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_activity_ttl ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_away_ttl ENABLE ROW LEVEL SECURITY;
ALTER TABLE presence_disconnect_grace ENABLE ROW LEVEL SECURITY;

-- Select policy for presence_state: allow users to view presence of any users they share a chat with, or themselves.
-- For simplicity to start, allow all authenticated to select. Tighten later if needed.
DROP POLICY IF EXISTS "presence_state select for authenticated" ON presence_state;
CREATE POLICY "presence_state select for authenticated"
  ON presence_state FOR SELECT
  TO authenticated
  USING (true);

-- Block direct writes from clients; only service role (edge functions) may write
DROP POLICY IF EXISTS "presence_state insert none" ON presence_state;
CREATE POLICY "presence_state insert none"
  ON presence_state FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "presence_state update none" ON presence_state;
CREATE POLICY "presence_state update none"
  ON presence_state FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

-- Device connections select only own records
DROP POLICY IF EXISTS "device_connections select own" ON device_connections;
CREATE POLICY "device_connections select own"
  ON device_connections FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Block inserts/updates/deletes from client
DROP POLICY IF EXISTS "device_connections write none" ON device_connections;
CREATE POLICY "device_connections write none"
  ON device_connections FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- TTL tables: no client access
DROP POLICY IF EXISTS "activity_ttl none" ON presence_activity_ttl;
CREATE POLICY "activity_ttl none" ON presence_activity_ttl FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "away_ttl none" ON presence_away_ttl;
CREATE POLICY "away_ttl none" ON presence_away_ttl FOR ALL TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "disconnect_grace none" ON presence_disconnect_grace;
CREATE POLICY "disconnect_grace none" ON presence_disconnect_grace FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Realtime: stream presence_state table changes
-- Supabase Realtime will pick up table DML automatically when enabled for the schema.

