-- Spaced-repetition review records (SM-2).
-- One row per (user, card). Upserted each time the user rates a card.

create table if not exists public.flashcard_reviews (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  card_id           text not null,
  ease_factor       numeric not null default 2.5,
  interval_days     integer not null default 0,
  repetitions       integer not null default 0,
  last_quality      integer,
  last_reviewed_at  timestamptz,
  next_review_at    timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (user_id, card_id)
);

create index if not exists flashcard_reviews_user_due_idx
  on public.flashcard_reviews (user_id, next_review_at);

alter table public.flashcard_reviews enable row level security;

create policy "own reviews - select"
  on public.flashcard_reviews for select
  using (auth.uid() = user_id);

create policy "own reviews - insert"
  on public.flashcard_reviews for insert
  with check (auth.uid() = user_id);

create policy "own reviews - update"
  on public.flashcard_reviews for update
  using (auth.uid() = user_id);
