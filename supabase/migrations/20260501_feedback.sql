-- Unified feedback table — stores both contact-us submissions and rating prompts.
-- Same table, different `type` values.
--
-- type:
--   'bug'      → bug report
--   'feature'  → feature request
--   'question' → support question
--   'other'    → catch-all
--   'rating'   → in-app rating prompt response (uses `rating` 1–5)
--
-- Run this in Supabase dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.feedback (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,                                 -- snapshot in case user is deleted
  type        TEXT         NOT NULL CHECK (type IN ('bug','feature','question','other','rating')),
  rating      INT          CHECK (rating BETWEEN 1 AND 5),
  message     TEXT,
  status      TEXT         NOT NULL DEFAULT 'new' CHECK (status IN ('new','seen','resolved')),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- For the admin dashboard's "what's new" filter
CREATE INDEX IF NOT EXISTS feedback_status_created
  ON public.feedback (status, created_at DESC);

-- For per-user history (optional, but cheap)
CREATE INDEX IF NOT EXISTS feedback_user_created
  ON public.feedback (user_id, created_at DESC);

-- Row-level security:
--   * Users can INSERT their own feedback (matches auth.uid())
--   * Only the service role (admin routes) can SELECT — keeps it private
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "feedback_insert_own" ON public.feedback;
CREATE POLICY "feedback_insert_own"
  ON public.feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
