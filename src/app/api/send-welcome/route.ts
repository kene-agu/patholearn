import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";
import { sendTemplatedEmail } from "@/lib/sendTemplatedEmail";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.getpatholearn.com";

/**
 * Called by the client from the auth state listener after every SIGNED_IN
 * event. Sends the welcome email only the first time (gated by
 * profiles.welcomed_at). Idempotent — subsequent logins are no-ops.
 */
export async function POST(request: NextRequest) {
  try {
    const authedUser = await verifyUser(request.headers.get("authorization"));
    if (!authedUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await db
      .from("profiles")
      .select("welcomed_at")
      .eq("id", authedUser.id)
      .single();

    if (profile?.welcomed_at) {
      return NextResponse.json({ alreadyWelcomed: true });
    }

    // Mark BEFORE sending so a racing second login can't double-fire even if
    // Resend is slow. If sending then fails, alertAdminError surfaces it.
    await db
      .from("profiles")
      .update({ welcomed_at: new Date().toISOString() })
      .eq("id", authedUser.id);

    const name = (authedUser.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

    void sendTemplatedEmail({
      kind: "welcome",
      to: authedUser.email!,
      variables: { name, appUrl: APP_URL },
      context: "post-signup",
    });

    return NextResponse.json({ sent: true });
  } catch (err) {
    console.error("send-welcome error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
