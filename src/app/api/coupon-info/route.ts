import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.toUpperCase().trim();
  if (!code) return NextResponse.json({ error: "Missing code" }, { status: 400 });

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await db
    .from("coupons")
    .select("max_uses, uses_count, is_active, expires_at")
    .eq("code", code)
    .single();

  if (!data || !data.is_active) {
    return NextResponse.json({ active: false, spotsLeft: 0, totalSpots: 0 });
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ active: false, spotsLeft: 0, totalSpots: 0 });
  }

  const spotsLeft = data.max_uses !== null
    ? Math.max(0, data.max_uses - data.uses_count)
    : null;

  return NextResponse.json({
    active:      true,
    spotsLeft,
    totalSpots:  data.max_uses,
    usesCount:   data.uses_count,
  });
}
