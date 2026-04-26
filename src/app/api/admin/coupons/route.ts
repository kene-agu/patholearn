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

  const { data, error } = await db
    .from("coupons")
    .select("id, code, discount_type, discount_value, max_uses, uses_count, expires_at, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coupons: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const body = await request.json();
  const { code, discount_type, discount_value, max_uses, expires_at } = body;

  if (!code || !discount_type || discount_value == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["percent", "fixed"].includes(discount_type)) {
    return NextResponse.json({ error: "discount_type must be percent or fixed" }, { status: 400 });
  }

  const { data, error } = await db
    .from("coupons")
    .insert({
      code:           code.toUpperCase().trim(),
      discount_type,
      discount_value: Number(discount_value),
      max_uses:       max_uses ? Number(max_uses) : null,
      expires_at:     expires_at || null,
      is_active:      true,
      uses_count:     0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ coupon: data });
}
