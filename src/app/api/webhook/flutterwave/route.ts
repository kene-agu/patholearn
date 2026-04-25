import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const FLW_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // Verify the request is genuinely from Flutterwave
  const hash = request.headers.get("verif-hash");
  if (!hash || hash !== FLW_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await request.json();

  if (event.event === "charge.completed" && event.data?.status === "successful") {
    const userId = event.data.meta?.user_id;
    if (!userId) return NextResponse.json({ received: true });

    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        subscription_status: "active",
        current_period_end:  periodEnd.toISOString(),
      })
      .eq("id", userId);

    if (error) console.error("Webhook Supabase update failed:", error);
  }

  return NextResponse.json({ received: true });
}
