import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function markCouponUsed(code: string) {
  const { data } = await supabaseAdmin
    .from("coupons")
    .select("uses_count")
    .eq("code", code)
    .single();
  if (data) {
    await supabaseAdmin
      .from("coupons")
      .update({ uses_count: data.uses_count + 1 })
      .eq("code", code);
  }
}

async function processReferral(referralCode: string, refereeId: string) {
  const { data: referrer } = await supabaseAdmin
    .from("profiles")
    .select("id, current_period_end, subscription_status")
    .eq("referral_code", referralCode)
    .single();

  if (!referrer || referrer.id === refereeId) return;

  // Idempotency check — only reward once per referee
  const { data: existing } = await supabaseAdmin
    .from("referrals")
    .select("id")
    .eq("referee_id", refereeId)
    .maybeSingle();

  if (existing) return;

  await supabaseAdmin.from("referrals").insert({
    referrer_id: referrer.id,
    referee_id:  refereeId,
    status:      "completed",
    rewarded_at: new Date().toISOString(),
  });

  // Reward referrer: +30 days on top of their current period
  if (referrer.subscription_status === "active" && referrer.current_period_end) {
    const newEnd = new Date(referrer.current_period_end);
    newEnd.setDate(newEnd.getDate() + 30);
    await supabaseAdmin
      .from("profiles")
      .update({ current_period_end: newEnd.toISOString() })
      .eq("id", referrer.id);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { transactionId, userId } = await request.json();
    if (!transactionId || !userId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${FLW_SECRET}` },
    });
    const data = await res.json();

    if (!res.ok || data.status !== "success" || data.data.status !== "successful") {
      return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
    }

    const meta           = data.data.meta || {};
    const plan           = meta.plan || "monthly";
    const expectedAmount = meta.expected_amount;
    const couponCode     = meta.coupon_code as string | null;
    const referralCode   = meta.referral_code as string | null;

    // Guard: allow up to 1% rounding tolerance, fall back to plan minimums
    const minAmount = expectedAmount ?? (plan === "annual" ? 18000 : 2000);
    if (data.data.amount < minAmount * 0.99 || data.data.currency !== "NGN") {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const periodEnd = new Date();
    if (plan === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: "active",
        current_period_end:  periodEnd.toISOString(),
        plan,
      })
      .eq("id", userId);

    if (dbError) {
      console.error("Supabase update error:", dbError);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    // Post-payment side effects — fire-and-forget, don't block the response
    if (couponCode)   markCouponUsed(couponCode).catch(console.error);
    if (referralCode) processReferral(referralCode, userId).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
