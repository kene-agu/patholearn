import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/push/subscribe — save a push subscription for the current user
export async function POST(req: NextRequest) {
  const user = await verifyUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { subscription?: PushSubscriptionJSON };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const sub = body.subscription;
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Upsert so re-subscribing the same endpoint is idempotent
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    console.error("[push/subscribe] upsert error:", error);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE /api/push/subscribe — remove the subscription for the current user
export async function DELETE(req: NextRequest) {
  const user = await verifyUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { endpoint?: string } = {};
  try {
    body = await req.json();
  } catch {
    // endpoint is optional — if not provided, delete all for this user
  }

  const supabase = getAdminClient();

  let query = supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id);

  if (body.endpoint) {
    query = query.eq("endpoint", body.endpoint);
  }

  const { error } = await query;
  if (error) {
    console.error("[push/subscribe] delete error:", error);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
