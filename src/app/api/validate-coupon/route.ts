import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();
    if (!code || typeof code !== "string") {
      return NextResponse.json({ valid: false, error: "Invalid code" }, { status: 400 });
    }

    const { data: coupon } = await supabaseAdmin
      .from("coupons")
      .select("discount_type, discount_value, max_uses, uses_count, expires_at, is_active")
      .eq("code", code.toUpperCase().trim())
      .single();

    if (!coupon || !coupon.is_active) {
      return NextResponse.json({ valid: false, error: "Coupon not found" });
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: "Coupon has expired" });
    }
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      return NextResponse.json({ valid: false, error: "Coupon usage limit reached" });
    }

    const description =
      coupon.discount_type === "percent"
        ? `${coupon.discount_value}% off`
        : `₦${coupon.discount_value.toLocaleString()} off`;

    return NextResponse.json({
      valid: true,
      discountType: coupon.discount_type,
      discountValue: coupon.discount_value,
      description,
    });
  } catch (err) {
    console.error("Validate coupon error:", err);
    return NextResponse.json({ valid: false, error: "Internal error" }, { status: 500 });
  }
}
