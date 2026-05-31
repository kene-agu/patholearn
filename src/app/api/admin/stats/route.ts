import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/adminAuth";
import { PRICES } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const [active, trial, expired, monthlySubs, annual, referrals, coupons] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "active"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "trialing"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "expired"),
    db.from("profiles").select("locked_price_monthly").eq("subscription_status", "active").eq("plan", "monthly"),
    db.from("profiles").select("id", { count: "exact", head: true }).eq("subscription_status", "active").eq("plan", "annual"),
    db.from("referrals").select("id", { count: "exact", head: true }).eq("status", "completed"),
    db.from("coupons").select("id", { count: "exact", head: true }).eq("is_active", true),
  ]);

  const annualCount = annual.count ?? 0;
  // MRR in NGN: sum each monthly sub's effective price (locked-in or public),
  // plus annual subs amortised over 12 months.
  const monthlyMrr = ((monthlySubs.data ?? []) as Array<{ locked_price_monthly: number | null }>).reduce(
    (sum, p) => sum + (p.locked_price_monthly ?? PRICES.monthly),
    0
  );
  const mrr = monthlyMrr + (annualCount * (PRICES.annual / 12));

  return NextResponse.json({
    active:    active.count    ?? 0,
    trial:     trial.count     ?? 0,
    expired:   expired.count   ?? 0,
    mrr:       Math.round(mrr * 100) / 100,
    referrals: referrals.count ?? 0,
    activeCoupons: coupons.count ?? 0,
  });
}
