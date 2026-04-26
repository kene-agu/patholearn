-- Run this in the Supabase SQL editor

-- Coupons: admin-created discount codes
CREATE TABLE IF NOT EXISTS public.coupons (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT        UNIQUE NOT NULL,
  discount_type  TEXT        NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value INTEGER     NOT NULL CHECK (discount_value > 0),
  max_uses       INTEGER,                          -- NULL = unlimited
  uses_count     INTEGER     NOT NULL DEFAULT 0,
  expires_at     TIMESTAMPTZ,
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referrals: tracks who invited whom and reward status
CREATE TABLE IF NOT EXISTS public.referrals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referee_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewarded_at TIMESTAMPTZ,
  UNIQUE(referee_id)  -- one referrer per user
);

-- Add referral_code and plan columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan         TEXT CHECK (plan IN ('monthly', 'annual'));

-- Indexes
CREATE INDEX IF NOT EXISTS coupons_code_idx        ON public.coupons(code);
CREATE INDEX IF NOT EXISTS referrals_referrer_idx  ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referee_idx   ON public.referrals(referee_id);

-- RLS
ALTER TABLE public.coupons   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Policies: validation happens server-side (service role), users can only read their own referrals
CREATE POLICY "Users can read own referrals as referrer"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Sample coupon for testing (remove in production)
-- INSERT INTO public.coupons (code, discount_type, discount_value, max_uses)
-- VALUES ('WELCOME20', 'percent', 20, 100);
