import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

async function verifyAdminUser(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const supabase = getAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const adminEmails = (process.env.ADMIN_EMAIL ?? "").split(",").map(e => e.trim()).filter(Boolean);
  if (!user.email || !adminEmails.includes(user.email)) return null;
  return user;
}

// POST /api/push/send — admin-only: broadcast a push notification to all subscribers
export async function POST(req: NextRequest) {
  const adminUser = await verifyAdminUser(req.headers.get("authorization"));
  if (!adminUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!webpush) {
    return NextResponse.json(
      { error: "web-push package is not installed. Run: npm install web-push" },
      { status: 500 }
    );
  }

  let body: { title?: string; body?: string; url?: string; preview?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, body: notifBody, url, preview } = body;
  if (!title || !notifBody) {
    return NextResponse.json({ error: "title and body are required" }, { status: 400 });
  }

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

  const supabase = getAdminClient();

  // Preview mode: only send to the admin's own subscribed devices
  let query = supabase.from("push_subscriptions").select("endpoint, p256dh, auth");
  if (preview) {
    query = query.eq("user_id", adminUser.id);
  }

  const { data: subscriptions, error } = await query;

  if (error) {
    console.error("[push/send] fetch subscriptions error:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }

  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({
      ok: true, sent: 0, failed: 0, preview: preview ?? false,
      ...(preview ? { hint: "No subscriptions found for your account. Enable notifications on your device first." } : {}),
    });
  }

  const payload = JSON.stringify({ title, body: notifBody, url: url ?? "/" });
  const subs = subscriptions as PushSubscriptionRow[];

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
    )
  );

  const expiredEndpoints: string[] = [];
  const errors: { statusCode?: number; message: string }[] = [];

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const reason = r.reason as { statusCode?: number; body?: string; message?: string };
      const statusCode = reason?.statusCode;
      // 404/410 mean the push subscription is permanently gone — drop it so it stops failing forever.
      if (statusCode === 404 || statusCode === 410) {
        expiredEndpoints.push(subs[i].endpoint);
      }
      const message = reason?.body?.trim() || reason?.message || "Unknown error";
      errors.push({ statusCode, message });
      console.warn(`[push/send] failed idx ${i} (status ${statusCode ?? "?"}):`, message);
    }
  });

  if (expiredEndpoints.length > 0) {
    const { error: pruneError } = await supabase
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints);
    if (pruneError) console.warn("[push/send] failed to prune expired subscriptions:", pruneError);
  }

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - sent;

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    preview: preview ?? false,
    // Surface why sends failed so the admin can diagnose (especially in preview mode).
    ...(errors.length > 0 ? { errors: errors.slice(0, 5) } : {}),
  });
}
