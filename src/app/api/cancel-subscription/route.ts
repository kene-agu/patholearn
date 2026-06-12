import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";
import { alertAdminError } from "@/lib/alertAdminError";
import { sendTemplatedEmail } from "@/lib/sendTemplatedEmail";

export const dynamic = "force-dynamic";

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!;
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL || "https://www.getpatholearn.com";

export async function POST(request: NextRequest) {
  try {
    const authedUser = await verifyUser(request.headers.get("authorization"));
    if (!authedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    if (userId !== authedUser.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    // If the user is on a true recurring subscription, cancel it with Flutterwave
    // first so their card isn't charged again. Users without flw_subscription_id
    // are on one-time payments (no auto-renewal to stop).
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("flw_subscription_id, current_period_end")
      .eq("id", userId)
      .single();

    const flwSubId = profile?.flw_subscription_id as string | null;
    const periodEnd = profile?.current_period_end as string | null;
    if (flwSubId) {
      const cancelRes = await fetch(
        `https://api.flutterwave.com/v3/subscriptions/${flwSubId}/cancel`,
        { method: "PUT", headers: { Authorization: `Bearer ${FLW_SECRET}` } }
      );
      if (!cancelRes.ok) {
        // Surface to admin but don't block the user-facing cancel — we still
        // mark canceled locally; if Flutterwave charges again the webhook will
        // re-activate and we can investigate manually.
        const body = await cancelRes.text().catch(() => "(no body)");
        console.error("Flutterwave cancel failed:", cancelRes.status, body);
        void alertAdminError({
          context: "cancel-subscription",
          summary: "Flutterwave /subscriptions/:id/cancel returned non-2xx — user may continue to be auto-charged",
          error: `HTTP ${cancelRes.status}: ${body}`,
          details: { userId, flwSubId },
        });
      }
    }

    // Always mark as canceled locally — access remains until current_period_end.
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ subscription_status: "canceled" })
      .eq("id", userId);

    if (error) {
      console.error("Cancel subscription error:", error);
      return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
    }

    // Cancellation confirmation — fire-and-forget.
    const name = (authedUser.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";
    const periodEndDisplay = periodEnd
      ? new Date(periodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "the end of your current period";
    void sendTemplatedEmail({
      kind: "cancelled",
      to: authedUser.email!,
      variables: { name, periodEnd: periodEndDisplay, appUrl: APP_URL },
      context: "post-cancel",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancel route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
