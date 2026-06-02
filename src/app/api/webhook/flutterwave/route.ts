import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { alertAdminError } from "@/lib/alertAdminError";

export const dynamic = "force-dynamic";

const FLW_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET!;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  const hash = request.headers.get("verif-hash");
  if (!hash || !safeEqual(hash, FLW_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await request.json();

  if (event.event === "charge.completed" && event.data?.status === "successful") {
    const userId = event.data.meta?.user_id;
    if (!userId) return NextResponse.json({ received: true });

    const plan = event.data.meta?.plan || "monthly";

    const periodEnd = new Date();
    if (plan === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const { error } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    ).from("profiles")
      .update({
        subscription_status: "active",
        current_period_end:  periodEnd.toISOString(),
        plan,
      })
      .eq("id", userId);

    if (error) {
      console.error("Webhook Supabase update failed:", error);
      void alertAdminError({
        context: "flutterwave-webhook",
        summary: "Flutterwave charge completed but activating the subscription FAILED — user paid but is not active",
        error,
        details: { userId, plan },
      });
    }
  }

  return NextResponse.json({ received: true });
}
