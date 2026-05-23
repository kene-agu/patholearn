create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_name  text not null,
  properties  jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists events_user_id_idx    on events (user_id);
create index if not exists events_event_name_idx on events (event_name);
create index if not exists events_created_at_idx on events (created_at desc);
create index if not exists events_user_event_idx on events (user_id, event_name);

alter table events enable row level security;

create policy "authenticated users can insert their own events"
  on events for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "service role can select all events"
  on events for select
  to service_role
  using (true);
