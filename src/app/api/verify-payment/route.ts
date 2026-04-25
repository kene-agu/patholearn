import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { transactionId, userId } = await request.json();
    if (!transactionId || !userId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Verify the transaction with Flutterwave
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionId}/verify`, {
      headers: { Authorization: `Bearer ${FLW_SECRET}` },
    });
    const data = await res.json();

    if (!res.ok || data.status !== "success" || data.data.status !== "successful") {
      return NextResponse.json({ error: "Payment not verified" }, { status: 400 });
    }

    // Guard against tampered amounts
    if (data.data.amount < 2000 || data.data.currency !== "NGN") {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    // Set subscription active for 30 days
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { error: dbError } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: "active",
        current_period_end:  periodEnd.toISOString(),
      })
      .eq("id", userId);

    if (dbError) {
      console.error("Supabase update error:", dbError);
      return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
