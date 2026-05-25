import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyAdmin } from "@/lib/adminAuth";

// web-push is a CommonJS module — import via dynamic require at runtime.
// The type declaration is typed as `any` intentionally since web-push has no
// official @types package and the module may not be installed yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let webpush: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  webpush = require("web-push");
} catch {
  webpush = null;
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// POST /api/push/send — admin-only: broadcast a push notification to all subscribers
export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!webpush) {
    return NextResponse.json(
      { error: "web-push package is not installed. Run: npm install web-push" },
      { status: 500 }
    );
  }

  let body: { title?: string; body?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, body: notifBody, url } = body;
  if (!title || !notifBody) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

  // Configure web-push VAPID details
  const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidMailto     = process.env.VAPID_MAILTO;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidMailto) {
    return NextResponse.json(
      { error: "VAPID env vars not configured (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_MAILTO)" },
      { status: 500 }
    );
  }

  webpush.setVapidDetails(vapidMailto, vapidPublicKey, vapidPrivateKey);

  // Fetch all subscriptions
  const supabase = getAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth");

  if (error) {
    console.error("[push/send] fetch subscriptions error:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, failed: 0 });
  }

  const payload = JSON.stringify({ title, body: notifBody, url: url ?? "/" });

  const results = await Promise.allSettled(
    (subscriptions as PushSubscriptionRow[]).map((sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };
      return webpush.sendNotification(pushSub, payload);
    })
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Log failures but don't surface them to the caller
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const rejection = r as PromiseRejectedResult;
      console.warn(`[push/send] failed to send to subscription ${i}:`, rejection.reason);
    }
  });

  return NextResponse.json({ ok: true, sent, failed });
}
