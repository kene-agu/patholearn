import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";
import { PRICES, formatPrice } from "@/lib/pricing";
import { alertAdminError } from "@/lib/alertAdminError";
import { sendTemplatedEmail } from "@/lib/sendTemplatedEmail";

export const dynamic = "force-dynamic";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || "https://www.getpatholearn.com";

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
    const meta = (txData.meta ?? {}) as Record<string, unknown>;

    if (meta.user_id && meta.user_id !== userId) {
      return NextResponse.json({ error: "Transaction does not belong to this user" }, { status: 403 });
    }

    // Flutterwave returns amount in major units already
    const paidAmount     = txData.amount as number;
    const plan           = (meta.plan as string) || "monthly";
    const expectedAmount = (meta.expected_amount as number) ?? PRICES[plan === "annual" ? "annual" : "monthly"];
    const couponCode     = meta.coupon_code as string | null;
    const referralCode   = meta.referral_code as string | null;

    if (paidAmount < expectedAmount * 0.99 || txData.currency !== "NGN") {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const periodEnd = new Date();
    if (plan === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    // If this was a recurring payment (Flutterwave Payment Plan), look up the
    // subscription ID so we can cancel it later via /v3/subscriptions/:id/cancel.
    let flwSubscriptionId: string | null = null;
    const paymentPlanInTx = (txData as { payment_plan?: number | string }).payment_plan;
    if (paymentPlanInTx) {
      try {
        const customerEmail = (txData as { customer?: { email?: string } }).customer?.email;
        if (customerEmail) {
          const subRes = await fetch(
            `https://api.flutterwave.com/v3/subscriptions?email=${encodeURIComponent(customerEmail)}`,
            { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
          );
          const subData = await subRes.json();
          if (subRes.ok && subData.status === "success" && Array.isArray(subData.data)) {
            const planNum = Number(paymentPlanInTx);
            const match = (subData.data as Array<{ id?: number; plan?: number; status?: string }>)
              .find((s) => s.plan === planNum && s.status === "active");
            if (match?.id) flwSubscriptionId = String(match.id);
          }
        }
      } catch (lookupErr) {
        console.error("FLW subscription lookup failed:", lookupErr);
      }
    }

    const { error: dbError } = await getAdmin()
      .from("profiles")
      .update({
        subscription_status: "active",
        current_period_end:  periodEnd.toISOString(),
        plan,
        ...(flwSubscriptionId ? { flw_subscription_id: flwSubscriptionId } : {}),
      })
      .eq("id", userId);

    if (dbError) {
      console.error("Supabase update error:", dbError);
      void alertAdminError({
        context: "verify-payment",
        summary: "Payment verified but activating the subscription FAILED — user paid but is not active",
        error: dbError,
        details: { userId, plan },
      });
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    if (couponCode)   markCouponUsed(couponCode).catch(console.error);
    if (referralCode) processReferral(referralCode, userId).catch(console.error);

    // Confirmation email — fire-and-forget; sendTemplatedEmail alerts admin on failure.
    const name = (authedUser.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";
    void sendTemplatedEmail({
      kind: "paid",
      to: authedUser.email!,
      variables: {
        name,
        plan: plan === "annual" ? "Annual" : "Monthly",
        amount: formatPrice(paidAmount),
        nextBilling: periodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
        appUrl: APP_URL,
      },
      context: "post-subscribe",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify payment error:", err);
    void alertAdminError({
      context: "verify-payment",
      summary: "Unexpected error in /api/verify-payment — a payment may not have been processed",
      error: err,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
