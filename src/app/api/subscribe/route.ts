import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";
import { PRICES, isValidCurrency, type Currency, type Plan } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const PS_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const APP_URL   = process.env.NEXT_PUBLIC_APP_URL || "https://patholearn-six.vercel.app";

// Paystack requires amounts in the smallest currency unit (kobo, cents, etc.)
function toSubunit(amount: number): number {
  return Math.round(amount * 100);
}

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

async function referralDiscountAmount(db: SupabaseClient, refCode: string, userId: string, currency: Currency): Promise<number> {
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

  return Math.round(PRICES[currency].monthly * 0.2);
}

export async function POST(request: NextRequest) {
  try {
    if (!PS_SECRET) {
      console.error("PAYSTACK_SECRET_KEY env var is not set");
      return NextResponse.json({ error: "Payment service not configured" }, { status: 500 });
    }

    const authedUser = await verifyUser(request.headers.get("authorization"));
    if (!authedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { userId, email, plan = "monthly", currency: rawCurrency = "NGN", couponCode, referralCode } = await request.json();

    if (!userId || !email) {
      return NextResponse.json({ error: "Missing user info" }, { status: 400 });
    }
    if (userId !== authedUser.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }
    if (plan !== "monthly" && plan !== "annual") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (!isValidCurrency(rawCurrency)) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 });
    }
    const currency: Currency = rawCurrency;
    const planKey: Plan = plan;

    const baseAmount        = PRICES[currency][planKey];
    let finalAmount: number = baseAmount;
    let appliedCode: string | null = null;

    if (couponCode) {
      const coupon = await resolveCoupon(supabaseAdmin, couponCode);
      if (coupon) {
        if (coupon.discount_type === "percent") {
          finalAmount = Math.round(baseAmount * (1 - coupon.discount_value / 100));
          appliedCode = coupon.code;
        } else if (currency === "NGN") {
          finalAmount = Math.max(0, baseAmount - coupon.discount_value);
          appliedCode = coupon.code;
        }
      }
    } else if (referralCode) {
      const discountAmt = await referralDiscountAmount(supabaseAdmin, referralCode, userId, currency);
      finalAmount = baseAmount - discountAmt;
    }

    const reference  = `patholearn-${userId}-${Date.now()}`;
    const planLabel  = plan === "annual" ? "Annual" : "Monthly";

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PS_SECRET}`,
      },
      body: JSON.stringify({
        email,
        amount:       toSubunit(finalAmount),
        currency,
        reference,
        callback_url: `${APP_URL}/payment/success`,
        label:        `PathoLearn Premium — ${planLabel}`,
        metadata: {
          user_id:         userId,
          plan,
          currency,
          expected_amount: finalAmount,
          coupon_code:     appliedCode,
          referral_code:   referralCode ? referralCode.toUpperCase().trim() : null,
        },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      console.error("Paystack error:", JSON.stringify(data));
      const reason = data?.message ?? "Unknown Paystack error";
      return NextResponse.json({ error: `Failed to create payment link: ${reason}` }, { status: 500 });
    }

    return NextResponse.json({ paymentLink: data.data.authorization_url });
  } catch (err) {
    console.error("Subscribe route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
