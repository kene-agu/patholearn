-- Grandfather all existing users at ₦1,900/month for life.
-- Users created AFTER this migration get NULL → they pay the current
-- public price (PRICES.monthly in src/lib/pricing.ts).
alter table public.profiles
  add column if not exists locked_price_monthly integer;

update public.profiles
  set locked_price_monthly = 1900
  where locked_price_monthly is null;
