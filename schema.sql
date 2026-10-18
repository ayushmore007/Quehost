-- =============================================================================
-- Quehost Database Schema for Supabase Postgres
-- Mobile-First Live Q&A Web App
-- =============================================================================

-- 1. Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Questions Table
-- Stores attendee submissions with client device identifier and 300 char text limit
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  text VARCHAR(300) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast lookups & counts
CREATE INDEX IF NOT EXISTS idx_questions_device_id ON questions (device_id);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions (created_at DESC);

-- 3. Settings Table
-- Stores global configuration toggles such as submission open/close state
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Initialize default 'open' state to 'true' if not already set
INSERT INTO settings (key, value)
VALUES ('open', 'true')
ON CONFLICT (key) DO NOTHING;

-- 4. Clusters Table
-- Replaced on each Gemini grouping run. Contains short English intent title,
-- count of distinct submitting devices, and array of matched question UUIDs.
CREATE TABLE IF NOT EXISTS clusters (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  count INT NOT NULL DEFAULT 0,
  question_ids UUID[] NOT NULL DEFAULT '{}',
  run_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clusters_count ON clusters (count DESC);

-- 5. Row Level Security (RLS)
-- Protects Supabase tables from direct unauthorized client access via anon keys.
-- All Next.js server routes use the SUPABASE_SERVICE_KEY which safely bypasses RLS.
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;

-- Allow public read of settings via anon key if ever needed, or restrict to service role
DROP POLICY IF EXISTS "Service role has full access to questions" ON questions;
CREATE POLICY "Service role has full access to questions"
  ON questions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to settings" ON settings;
CREATE POLICY "Service role has full access to settings"
  ON settings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to clusters" ON clusters;
CREATE POLICY "Service role has full access to clusters"
  ON clusters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. Atomic Question Submission Function (Concurrency & Double-Tap Safe)
-- Performs submission open check, device count verification, and insertion atomically.
CREATE OR REPLACE FUNCTION submit_question_atomic(
  p_device_id TEXT,
  p_text TEXT,
  p_max_limit INT DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_open TEXT;
  v_count INT;
  v_new_id UUID;
BEGIN
  -- Verify if submissions are currently open
  SELECT value INTO v_open FROM settings WHERE key = 'open';
  IF v_open IS DISTINCT FROM 'true' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'SUBMISSIONS_CLOSED',
      'message', 'Submissions are currently closed.'
    );
  END IF;

  -- Count existing questions for this device
  SELECT count(*) INTO v_count FROM questions WHERE device_id = p_device_id;
  IF v_count >= p_max_limit THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'LIMIT_REACHED',
      'message', 'You have reached the maximum of 5 questions.',
      'count', v_count
    );
  END IF;

  -- Insert question atomically
  INSERT INTO questions (device_id, text)
  VALUES (p_device_id, p_text)
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'count', v_count + 1
  );
END;
$$;

-- 7. Reset Event Data Function (Safe helper for admin reset)
CREATE OR REPLACE FUNCTION reset_event_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  TRUNCATE TABLE questions;
  TRUNCATE TABLE clusters;
  UPDATE settings SET value = 'true' WHERE key = 'open';
END;
$$;
