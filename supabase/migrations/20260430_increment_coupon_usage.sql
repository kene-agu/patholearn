-- Atomic coupon usage increment.
-- The previous client-side read-then-write was racy: two simultaneous
-- payments could both pass the "uses_count < max_uses" check and both
-- increment, exceeding the limit.
--
-- This RPC does the check-and-update in a single statement so concurrent
-- callers can't both succeed past the cap.
--
-- Returns true if the increment was applied, false if the coupon is
-- already at its limit (or doesn't exist).

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated int;
BEGIN
  UPDATE public.coupons
     SET uses_count = uses_count + 1
   WHERE code = upper(trim(p_code))
     AND is_active = true
     AND (max_uses IS NULL OR uses_count < max_uses);

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- Allow service role to call this (used from the verify-payment route)
GRANT EXECUTE ON FUNCTION public.increment_coupon_usage(text) TO service_role;
