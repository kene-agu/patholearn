-- Fix: the original migration enabled RLS on support_escalations and
-- chatbot_reviews but never added INSERT policies, so anon-key inserts from
-- the chat widget (escalations + reviews) were silently rejected and nothing
-- showed up in the admin Support tab.

create policy "anyone_can_create_escalations" on support_escalations
  for insert with check (true);

create policy "anyone_can_update_escalations" on support_escalations
  for update using (true) with check (true);

create policy "anyone_can_create_reviews" on chatbot_reviews
  for insert with check (true);
