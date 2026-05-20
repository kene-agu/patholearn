import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set([
  "window.error",
  "unhandledrejection",
  "ErrorBoundary",
  "manual",
]);

const MAX_MESSAGE = 2000;
const MAX_STACK   = 8000;
const MAX_URL     = 2000;
const MAX_UA      = 1000;
const MAX_SIG     = 512;
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.getpatholearn.com";

function trim(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest) {
  try {
    // Auth is OPTIONAL — anonymous visitors can also hit errors and we want
    // to capture those too. If the header is present we attach the user.
    const user = await verifyUser(request.headers.get("authorization"));

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const message = trim(body.message, MAX_MESSAGE);
    if (!message) {
      return NextResponse.json({ error: "Missing message." }, { status: 400 });
    }

    const source = String(body.source ?? "manual");
    if (!VALID_SOURCES.has(source)) {
      return NextResponse.json({ error: "Invalid source." }, { status: 400 });
    }

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    const stack     = trim(body.stack, MAX_STACK);
    const url       = trim(body.url, MAX_URL);
    const userAgent = trim(body.user_agent, MAX_UA);
    const signature = trim(body.signature, MAX_SIG);

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check whether this signature is a new occurrence in the last 24h.
    // If new → email; if repeat → DB only. Done BEFORE insert so the insert
    // doesn't count itself. Skipped if no signature (then we always email).
    let isFirstInWindow = true;
    if (signature) {
      const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
      const { count } = await db
        .from("client_errors")
        .select("id", { count: "exact", head: true })
        .eq("signature", signature)
        .gte("created_at", since);
      isFirstInWindow = (count ?? 0) === 0;
    }

    const { error: dbError } = await db.from("client_errors").insert({
      user_id:    user?.id ?? null,
      user_email: user?.email ?? null,
      message,
      stack,
      source,
      url,
      user_agent: userAgent,
      metadata,
      signature,
    });

    if (dbError) {
      console.error("[client-errors] DB insert failed:", dbError);
      return NextResponse.json({ error: "Failed to save error." }, { status: 500 });
    }

    // Email notification (fire-and-forget). Only on the first occurrence
    // of a signature in a 24h window, so a single bug doesn't spam you.
    if (isFirstInWindow) {
      void notifyAdmin({
        source,
        message,
        stack,
        url,
        userAgent,
        userEmail: user?.email ?? null,
        userId:    user?.id ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[client-errors] Unexpected:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

interface NotifyArgs {
  source: string;
  message: string;
  stack: string | null;
  url: string | null;
  userAgent: string | null;
  userEmail: string | null;
  userId: string | null;
}

async function notifyAdmin(args: NotifyArgs): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map(e => e.trim()).filter(Boolean);
  const fromAddr = process.env.FEEDBACK_FROM || "PathoLearn <onboarding@resend.dev>";

  if (!resendKey || adminEmails.length === 0) {
    console.warn("[client-errors] Email skipped — RESEND_API_KEY or ADMIN_EMAIL missing");
    return;
  }

  try {
    const resend = new Resend(resendKey);
    const who = args.userEmail ? esc(args.userEmail) : "anonymous visitor";
    const subject = `[PathoLearn] Client error: ${args.message.slice(0, 80)}`;
    const html = `
      <h2>New client error</h2>
      <p><strong>Source:</strong> <code>${esc(args.source)}</code></p>
      <p><strong>User:</strong> ${who}${args.userId ? ` (<code>${esc(args.userId)}</code>)` : ""}</p>
      ${args.url ? `<p><strong>URL:</strong> <a href="${esc(args.url)}">${esc(args.url)}</a></p>` : ""}
      ${args.userAgent ? `<p><strong>User agent:</strong> <code style="font-size:11px;">${esc(args.userAgent)}</code></p>` : ""}
      <hr/>
      <h3 style="margin-bottom:4px;">Message</h3>
      <pre style="white-space:pre-wrap;background:#f6f8fa;padding:10px;border-radius:6px;font-size:13px;">${esc(args.message)}</pre>
      ${args.stack ? `<h3 style="margin-bottom:4px;">Stack</h3>
        <pre style="white-space:pre-wrap;background:#f6f8fa;padding:10px;border-radius:6px;font-size:11px;max-height:400px;overflow:auto;">${esc(args.stack)}</pre>` : ""}
      <hr/>
      <p style="font-size:12px;color:#666;">
        First occurrence in 24h. Repeats within the window are stored silently.
        <br/>
        <a href="${APP_URL}/admin">Open admin → Errors tab</a> to see all.
      </p>
    `;
    const { data: sendResult, error: sendError } = await resend.emails.send({
      from: fromAddr,
      to:   adminEmails,
      subject,
      html,
    });
    if (sendError) {
      console.error("[client-errors] Resend rejected:", sendError);
    } else {
      console.log("[client-errors] Email queued:", sendResult?.id);
    }
  } catch (emailErr) {
    console.error("[client-errors] Resend threw (non-fatal):", emailErr);
  }
}
