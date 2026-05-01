import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const authedUser = await verifyUser(request.headers.get("authorization"));
    if (!authedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    if (userId !== authedUser.id) {
      return NextResponse.json({ error: "User mismatch" }, { status: 403 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Only allow reactivation if still within the paid period
    const { data: profile } = await db
      .from("profiles")
      .select("subscription_status, current_period_end")
      .eq("id", userId)
      .single();

    if (!profile || profile.subscription_status !== "canceled") {
      return NextResponse.json({ error: "No cancellation to undo" }, { status: 400 });
    }
    if (!profile.current_period_end || new Date(profile.current_period_end) <= new Date()) {
      return NextResponse.json({ error: "Subscription has already expired" }, { status: 400 });
    }

    const { error } = await db
      .from("profiles")
      .update({ subscription_status: "active" })
      .eq("id", userId);

    if (error) {
      console.error("Reactivate subscription error:", error);
      return NextResponse.json({ error: "Failed to reactivate" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reactivate route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
