-- Ungrandfather every user: the locked_price_monthly experiment is over.
-- All subscribers now pay the public NGN price set in src/lib/pricing.ts.
-- Column is kept (nullable) so we can selectively grandfather individuals
-- in the future without another schema change.
update public.profiles set locked_price_monthly = null;

-- Track Flutterwave Payment Plan subscription IDs so we can cancel/manage
-- recurring subscriptions via the Flutterwave API. NULL means the user is
-- on a one-time payment (coupon discount, referral discount, or a future
-- grandfathered user) rather than true recurring.
alter table public.profiles
  add column if not exists flw_subscription_id text;
