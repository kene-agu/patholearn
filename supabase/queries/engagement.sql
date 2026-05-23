-- ── 1. WAU — unique users who viewed a slide in the last 14 days ──────────────
select
  date_trunc('week', created_at) as week_start,
  count(distinct user_id)        as weekly_active_users
from events
where
  event_name = 'slide_viewed'
  and created_at >= now() - interval '14 days'
group by 1
order by 1 desc;


-- ── 2. Engaged users — users with 3+ distinct active days (any event) ─────────
select count(*) as engaged_users
from (
  select user_id
  from events
  where created_at >= now() - interval '30 days'
  group by user_id
  having count(distinct created_at::date) >= 3
) t;


-- ── 3. Paywall hit rate — share of active users who saw a paywall ─────────────
with active_users as (
  select distinct user_id
  from events
  where created_at >= now() - interval '30 days'
),
paywall_users as (
  select distinct user_id
  from events
  where
    event_name = 'paywall_shown'
    and created_at >= now() - interval '30 days'
)
select
  count(distinct a.user_id)                              as active_users,
  count(distinct p.user_id)                              as paywall_users,
  round(
    count(distinct p.user_id)::numeric
    / nullif(count(distinct a.user_id), 0) * 100, 1
  )                                                      as paywall_hit_rate_pct
from active_users a
left join paywall_users p using (user_id);


-- ── 4. Per-user summary ───────────────────────────────────────────────────────
select
  u.id                                                       as user_id,
  u.email,
  count(distinct e.created_at::date)                         as active_days,
  count(*) filter (where e.event_name = 'slide_viewed')      as slides_viewed,
  count(*) filter (where e.event_name = 'paywall_shown')     as paywalls_hit,
  max(e.created_at)                                          as last_activity
from auth.users u
join events e on e.user_id = u.id
group by u.id, u.email
order by last_activity desc;
