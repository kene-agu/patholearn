import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

const PS_SECRET = process.env.PAYSTACK_SECRET_KEY!;

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-paystack-signature");
  const body      = await request.text();

  if (!signature || !PS_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expected = createHmac("sha512", PS_SECRET).update(body).digest("hex");
  const sigBuf   = Buffer.from(signature);
  const expBuf   = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event === "charge.success" && event.data?.status === "success") {
    const meta   = event.data.metadata ?? {};
    const userId = meta.user_id;
    if (!userId) return NextResponse.json({ received: true });

    const plan = meta.plan || "monthly";

    const periodEnd = new Date();
    if (plan === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const { error } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
      .from("profiles")
      .update({
        subscription_status: "active",
        current_period_end:  periodEnd.toISOString(),
        plan,
      })
      .eq("id", userId);

    if (error) console.error("Webhook Supabase update failed:", error);
  }

  return NextResponse.json({ received: true });
}
