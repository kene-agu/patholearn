import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || "https://patholearn-six.vercel.app";

const BASE_PRICES = { monthly: 2000, annual: 18000 } as const;
type Plan = keyof typeof BASE_PRICES;


async function resolveCoupon(db: SupabaseClient, code: string) {
  const { data } = await db
    .from("coupons")
    .select("code, discount_type, discount_value, max_uses, uses_count, expires_at, is_active")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (!data || !data.is_active) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  if (data.max_uses !== null && data.uses_count >= data.max_uses) return null;
  return data;
}

async function referralDiscountAmount(db: SupabaseClient, refCode: string, userId: string): Promise<number> {
  const clean = refCode.toUpperCase().trim();

  const { data: referrer } = await db
    .from("profiles")
    .select("id")
    .eq("referral_code", clean)
    .single();

  if (!referrer || referrer.id === userId) return 0;

  const { data: profile } = await db
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .single();

  const isFirstSub = !profile?.subscription_status || profile.subscription_status === "trial";
  if (!isFirstSub) return 0;

  const { data: existing } = await db
    .from("referrals")
    .select("id")
    .eq("referee_id", userId)
    .maybeSingle();

  if (existing) return 0;

  return Math.round(BASE_PRICES.monthly * 0.2);
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { userId, email, plan = "monthly", couponCode, referralCode } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing user info" }, { status: 400 });
    }
    if (!(plan in BASE_PRICES)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const baseAmount          = BASE_PRICES[plan as Plan];
    let finalAmount: number   = baseAmount;
    let appliedCode: string | null = null;

    // Coupon takes priority over referral discount
    if (couponCode) {
      const coupon = await resolveCoupon(supabaseAdmin, couponCode);
      if (coupon) {
        finalAmount =
          coupon.discount_type === "percent"
            ? Math.round(baseAmount * (1 - coupon.discount_value / 100))
            : Math.max(0, baseAmount - coupon.discount_value);
        appliedCode = coupon.code;
      }
    } else if (referralCode) {
      const discountAmt = await referralDiscountAmount(supabaseAdmin, referralCode, userId);
      finalAmount = baseAmount - discountAmt;
    }

    const txRef    = `patholearn-${userId}-${Date.now()}`;
    const planLabel = plan === "annual" ? "Annual" : "Monthly";

    const res = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FLW_SECRET}`,
      },
      body: JSON.stringify({
        tx_ref:       txRef,
        amount:       finalAmount,
        currency:     "NGN",
        redirect_url: `${APP_URL}/payment/success`,
        customer:     { email, name: "PathoLearn User" },
        customizations: {
          title:       `PathoLearn Premium — ${planLabel}`,
          description: `${planLabel} subscription — unlimited AI slide analysis`,
        },
        meta: {
          user_id:         userId,
          plan,
          expected_amount: finalAmount,
          coupon_code:     appliedCode,
          referral_code:   referralCode ? referralCode.toUpperCase().trim() : null,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || data.status !== "success") {
      console.error("Flutterwave error:", data);
      return NextResponse.json({ error: "Failed to create payment link" }, { status: 500 });
    }

    return NextResponse.json({ paymentLink: data.data.link });
  } catch (err) {
    console.error("Subscribe route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
