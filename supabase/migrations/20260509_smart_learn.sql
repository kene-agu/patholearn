-- Smart Slide → Learn feature schema
-- Run in Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── pdf_documents ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pdf_documents (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  file_name       text NOT NULL,
  storage_path    text NOT NULL,          -- Supabase Storage path to original PDF
  total_pages     int  NOT NULL DEFAULT 0,
  extracted_text  text,                   -- full concatenated text from all pages
  summary         text,                   -- AI-generated summary
  status          text NOT NULL DEFAULT 'processing'  -- processing | ready | error
                  CHECK (status IN ('processing', 'ready', 'error')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own PDFs"
  ON public.pdf_documents FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── pdf_slides ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pdf_slides (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id          uuid NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_number     int  NOT NULL,
  thumb_path      text,                   -- 200px WebP thumbnail storage path
  full_path       text,                   -- full-res WebP storage path
  page_text       text,                   -- extracted text for this page
  analysis_json   jsonb,                  -- Gemini+Claude analysis result
  quiz_json       jsonb,                  -- generated MCQ questions array
  flashcard_json  jsonb,                  -- generated flashcards array
  analyzed_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own slides"
  ON public.pdf_slides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX pdf_slides_pdf_id_idx ON public.pdf_slides(pdf_id);
CREATE INDEX pdf_slides_page_idx   ON public.pdf_slides(pdf_id, page_number);

-- ── pdf_chat_messages ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pdf_chat_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_id      uuid NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  slide_id    uuid REFERENCES public.pdf_slides(id) ON DELETE SET NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pdf_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own chat"
  ON public.pdf_chat_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX chat_pdf_slide_idx ON public.pdf_chat_messages(pdf_id, slide_id);

-- ── user_pdf_progress ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_pdf_progress (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_id          uuid NOT NULL REFERENCES public.pdf_documents(id) ON DELETE CASCADE,
  current_slide   int  NOT NULL DEFAULT 0,
  slides_viewed   int[] NOT NULL DEFAULT '{}',
  quiz_scores     jsonb NOT NULL DEFAULT '[]',  -- [{slideId, score, total, at}]
  flashcard_state jsonb NOT NULL DEFAULT '{}',  -- {cardId: {ef, interval, reps, nextReview}}
  last_mode       text NOT NULL DEFAULT 'quiz', -- quiz | flashcards | tutor
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, pdf_id)
);

ALTER TABLE public.user_pdf_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own progress"
  ON public.user_pdf_progress FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Storage buckets (run separately in Supabase dashboard or via SQL) ─────────
-- Bucket: pdf-documents  (private, 50 MB per file)
-- Bucket: pdf-slides     (private, 10 MB per file — WebP images)
--
-- In Supabase dashboard → Storage → New bucket:
--   Name: pdf-documents  | Public: OFF | File size limit: 52428800
--   Name: pdf-slides     | Public: OFF | File size limit: 10485760
--
-- Storage RLS policies (Supabase dashboard → Storage → Policies):
--   INSERT/SELECT/DELETE: auth.uid()::text = (storage.foldername(name))[1]
