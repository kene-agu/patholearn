-- ── user_sessions ────────────────────────────────────────────────────────────
-- Tracks active device sessions per user.
-- Max 2 simultaneous active sessions are enforced by the client-side hook.
-- A session is considered active if last_seen is within the last 10 minutes.
-- Run this in your Supabase dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id   TEXT        NOT NULL,
  device_hint TEXT,                          -- e.g. "Windows", "Mac", "iOS"
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

-- Indexes for fast per-user lookups
CREATE INDEX IF NOT EXISTS user_sessions_user_last
  ON public.user_sessions (user_id, last_seen DESC);

-- Row-level security — users can only see and manage their own sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_sessions" ON public.user_sessions;
CREATE POLICY "users_own_sessions"
  ON public.user_sessions
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
