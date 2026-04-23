-- Add image storage + full analysis to slide_history
alter table public.slide_history
  add column if not exists image_url    text,
  add column if not exists analysis_json jsonb;

-- Storage bucket for slide images (run once)
insert into storage.buckets (id, name, public)
  values ('slide-images', 'slide-images', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload their own slides
create policy if not exists "authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'slide-images');

-- Allow anyone to read slide images (public bucket)
create policy if not exists "public read"
  on storage.objects for select
  using (bucket_id = 'slide-images');
