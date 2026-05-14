import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await verifyAdmin(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { searchParams } = new URL(request.url);

  // ?sharers=true → users who have generated a referral code (actively sharing)
  if (searchParams.get("sharers") === "true") {
    const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit  = 20;
    const offset = (page - 1) * limit;

    const { data, count, error } = await db
      .from("profiles")
      .select("id, email, referral_code, subscription_status, created_at", { count: "exact" })
      .not("referral_code", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sharers: data ?? [], total: count ?? 0, page, limit });
  }

  // Default → completed referral conversions
  const page   = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit  = 20;
  const offset = (page - 1) * limit;

  const { data, count, error } = await db
    .from("referrals")
    .select(
      "id, referrer_id, referee_id, status, discount_amount, created_at, referrer:profiles!referrer_id(email, referral_code), referee:profiles!referee_id(email)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ referrals: data ?? [], total: count ?? 0, page, limit });
}
