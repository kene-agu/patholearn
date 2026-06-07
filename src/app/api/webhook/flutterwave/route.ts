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

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Renewal charges fire `charge.completed` but the original tx meta may not
// carry over — fall back to customer email, then to the stored subscription ID.
async function resolveUserId(eventData: {
  meta?: { user_id?: string };
  customer?: { email?: string };
  id?: number | string;
  payment_plan?: number | string;
}): Promise<string | null> {
  const metaUserId = eventData.meta?.user_id;
  if (metaUserId) return String(metaUserId);

  const db = getAdmin();
  const customerEmail = eventData.customer?.email;
  if (customerEmail) {
    const { data: { users } } = await db.auth.admin.listUsers();
    const match = users.find((u) => u.email?.toLowerCase() === customerEmail.toLowerCase());
    if (match) return match.id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const hash = request.headers.get("verif-hash");
  if (!hash || !safeEqual(hash, FLW_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const event = await request.json();

  // Successful charge — initial subscription OR a recurring renewal. Same handling:
  // mark active and extend current_period_end to (now + interval).
  if (event.event === "charge.completed" && event.data?.status === "successful") {
    const userId = await resolveUserId(event.data);
    if (!userId) return NextResponse.json({ received: true });

    const plan = event.data.meta?.plan || "monthly";

    const periodEnd = new Date();
    if (plan === "annual") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    const { error } = await getAdmin().from("profiles")
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

  // Flutterwave gave up retrying a failing recurring charge and cancelled the
  // subscription on their end. Reflect that in our DB so the user sees the
  // expired state and can resubscribe.
  if (event.event === "subscription.cancelled" || event.event === "subscription.deactivated") {
    const subId = event.data?.id ? String(event.data.id) : null;
    if (subId) {
      const { error } = await getAdmin().from("profiles")
        .update({ subscription_status: "canceled" })
        .eq("flw_subscription_id", subId);
      if (error) console.error("Webhook: failed to mark subscription canceled:", error);
    }
  }

  return NextResponse.json({ received: true });
}
