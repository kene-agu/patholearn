-- Run this once in your Supabase SQL editor to enable the Personal Slides feature.

create table if not exists public.personal_slides (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  image_url   text not null,
  created_at  timestamptz default now() not null
);

alter table public.personal_slides enable row level security;

-- Users can only see and manage their own slides
create policy "personal_slides_user_access"
  on public.personal_slides
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
