-- Client-side error log: stores uncaught errors, unhandled promise rejections,
-- and React render crashes captured on the client.
--
-- Inserts happen only from /api/client-errors (service role bypasses RLS).
-- Reads happen only from /api/admin/errors (also service role).
-- RLS is enabled with no policies → no direct access for users.
--
-- Run this in Supabase dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.client_errors (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  message     TEXT         NOT NULL,
  stack       TEXT,
  source      TEXT         NOT NULL CHECK (source IN ('window.error','unhandledrejection','ErrorBoundary','manual')),
  url         TEXT,
  user_agent  TEXT,
  metadata    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  signature   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_errors_created
  ON public.client_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS client_errors_signature
  ON public.client_errors (signature);

CREATE INDEX IF NOT EXISTS client_errors_user_created
  ON public.client_errors (user_id, created_at DESC);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
-- No policies = no direct user access. API routes use the service role.
