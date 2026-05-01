import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Auth — only the signed-in user can cancel their own subscription
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

    // Mark as canceled — stays active until current_period_end, then expires
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ subscription_status: "canceled" })
      .eq("id", userId);

    if (error) {
      console.error("Cancel subscription error:", error);
      return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Cancel route error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
