import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";
import { PRICES, isValidCurrency } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function markCouponUsed(code: string) {
  const db = getAdmin();
  const { error: rpcError } = await db.rpc("increment_coupon_usage", { p_code: code });
  if (rpcError) {
    console.warn("[coupon] RPC missing, using non-atomic fallback:", rpcError.message);
    const { data } = await db
      .from("coupons")
      .select("uses_count")
      .eq("code", code)
      .single();
    if (data) {
      await db.from("coupons").update({ uses_count: data.uses_count + 1 }).eq("code", code);
    }
  }
}

async function processReferral(referralCode: string, refereeId: string) {
  const db = getAdmin();
  const { data: referrer } = await db
    .from("profiles")
    .select("id, current_period_end, subscription_status")
    .eq("referral_code", referralCode)
    .single();

  if (!referrer || referrer.id === refereeId) return;

  const { data: existing } = await db
    .from("referrals")
    .select("id")
    .eq("referee_id", refereeId)
    .maybeSingle();

  if (existing) return;

  await db.from("referrals").insert({
    referrer_id: referrer.id,
    referee_id:  refereeId,
    status:      "completed",
    rewarded_at: new Date().toISOString(),
  });

  if (referrer.subscription_status === "active" && referrer.current_period_end) {
    const newEnd = new Date(referrer.current_period_end);
    newEnd.setDate(newEnd.getDate() + 30);
    await db
      .from("profiles")
      .update({ current_period_end: newEnd.toISOString() })
      .eq("id", referrer.id);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authedUser = await verifyUser(request.headers.get("authorization"));
    if (!authedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transaction_id, userId } = await request.json();
    if (!transaction_id || !userId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    if (userId !== authedUser.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    // Support both numeric transaction ID and tx_ref (e.g. "patholearn-uuid-timestamp")
    let txData: Record<string, unknown> | null = null;

    if (/^\d+$/.test(String(transaction_id).trim())) {
      // Numeric ID — direct lookup
      const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`, {
        headers: { Authorization: `Bearer ${FLW_SECRET}` },
      });
      const data = await res.json();
      if (res.ok && data.status === "success" && data.data?.status === "successful") {
        txData = data.data;
      }
    } else {
      // tx_ref lookup
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions?tx_ref=${encodeURIComponent(String(transaction_id).trim())}`,
        { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
      );
      const data = await res.json();
      if (res.ok && data.status === "success" && Array.isArray(data.data)) {
        const match = (data.data as Record<string, unknown>[]).find(
          (t) => t.status === "successful"
        );
        if (match) txData = match;
      }
    }

    if (!txData) {
      return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
    }
    const meta: Record<string, unknown> = txData.meta ?? {};

    if (meta.user_id && meta.user_id !== userId) {
      return NextResponse.json({ error: "Transaction does not belong to this user" }, { status: 403 });
    }

    // Flutterwave returns amount in major units already
    const paidAmount     = txData.amount as number;
    const plan           = (meta.plan as string) || "monthly";
    const currency       = isValidCurrency(meta.currency) ? meta.currency : "USD";
    const expectedAmount = (meta.expected_amount as number) ?? PRICES[currency][plan === "annual" ? "annual" : "monthly"];
    const couponCode     = meta.coupon_code as string | null;
    const referralCode   = meta.referral_code as string | null;

    if (paidAmount < expectedAmount * 0.99 || txData.currency !== currency) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const periodEnd = new Date();
    if (plan === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const { error: dbError } = await getAdmin()
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

    if (couponCode)   markCouponUsed(couponCode).catch(console.error);
    if (referralCode) processReferral(referralCode, userId).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
