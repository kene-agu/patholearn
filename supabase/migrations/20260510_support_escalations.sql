-- Support escalations and reviews table
create table if not exists support_escalations (
  id uuid primary key default uuid_generate_v4(),
  conversation text not null,
  messages jsonb default '[]'::jsonb,
  user_email text,
  created_at timestamp with time zone default now(),
  status text default 'pending' -- pending, resolved
);

create table if not exists support_replies (
  id uuid primary key default uuid_generate_v4(),
  escalation_id uuid not null references support_escalations(id) on delete cascade,
  message text not null,
  created_at timestamp with time zone default now()
);

create table if not exists chatbot_reviews (
  id uuid primary key default uuid_generate_v4(),
  rating integer not null check (rating >= 1 and rating <= 5),
  text text,
  created_at timestamp with time zone default now()
);

-- Create indexes for faster queries
create index if not exists idx_escalations_created on support_escalations(created_at desc);
create index if not exists idx_escalations_status on support_escalations(status);
create index if not exists idx_replies_escalation on support_replies(escalation_id);
create index if not exists idx_reviews_created on chatbot_reviews(created_at desc);

-- Enable RLS
alter table support_escalations enable row level security;
alter table support_replies enable row level security;
alter table chatbot_reviews enable row level security;

-- Allow authenticated users to read (we'll add a check for admin later)
create policy "anyone_can_read_escalations" on support_escalations
  for select using (true);

create policy "anyone_can_read_replies" on support_replies
  for select using (true);

create policy "anyone_can_create_replies" on support_replies
  for insert with check (true);

create policy "anyone_can_read_reviews" on chatbot_reviews
  for select using (true);
