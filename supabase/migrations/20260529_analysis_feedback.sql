-- Per-analysis thumbs up/down feedback.
--
-- Lets users react to an individual slide analysis (👍 / 👎) right where they
-- read it, instead of waiting for the app-wide rating prompt. Stored in the
-- same `feedback` table so it flows into the existing admin dashboard.
--
-- New rows look like:
--   type    = 'analysis'
--   verdict = 'up' | 'down'
--   message = the diagnosis context + an optional free-text comment
--
-- Run this in Supabase dashboard → SQL Editor.

-- Thumbs verdict (null for every other feedback type).
ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS verdict TEXT CHECK (verdict IN ('up','down'));

-- Allow the new 'analysis' feedback type alongside the existing ones.
ALTER TABLE public.feedback DROP CONSTRAINT IF EXISTS feedback_type_check;
ALTER TABLE public.feedback
  ADD CONSTRAINT feedback_type_check
  CHECK (type IN ('bug','feature','question','other','rating','analysis'));

-- Fast "how's the analyzer doing?" slices for the admin dashboard.
CREATE INDEX IF NOT EXISTS feedback_verdict_created
  ON public.feedback (verdict, created_at DESC)
  WHERE verdict IS NOT NULL;
