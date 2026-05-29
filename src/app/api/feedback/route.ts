import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["bug", "feature", "question", "other", "rating", "analysis"]);
const MAX_MESSAGE = 4000;
const MAX_CONTEXT = 300;

export async function POST(request: NextRequest) {
  try {
    const authedUser = await verifyUser(request.headers.get("authorization"));

    const body = await request.json();
    const type = String(body.type ?? "").trim();
    let message = typeof body.message === "string" ? body.message.trim() : "";
    const ratingNum = body.rating != null ? Number(body.rating) : null;
    const verdict = typeof body.verdict === "string" ? body.verdict.trim() : "";
    const context = typeof body.context === "string" ? body.context.trim().slice(0, MAX_CONTEXT) : "";

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid feedback type." }, { status: 400 });
    }

    // Per-analysis thumbs feedback is open to guests too — it's a one-tap
    // reaction on the analyzer, which signed-out users can also use. Every
    // other feedback type still requires an account.
    if (type !== "analysis" && !authedUser) {
      return NextResponse.json({ error: "Sign in to send feedback." }, { status: 401 });
    }

    if (type === "rating") {
      if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        return NextResponse.json({ error: "Rating must be 1-5." }, { status: 400 });
      }
    } else if (type === "analysis") {
      if (verdict !== "up" && verdict !== "down") {
        return NextResponse.json({ error: "Verdict must be 'up' or 'down'." }, { status: 400 });
      }
      // Fold the analysis context (diagnosis) and the optional comment into the
      // message so it reads as one row in the admin dashboard.
      message = [context && `Re: ${context}`, message].filter(Boolean).join(" — ");
    } else {
      if (!message) {
        return NextResponse.json({ error: "Message is required." }, { status: 400 });
      }
    }
    if (message.length > MAX_MESSAGE) {
      return NextResponse.json({ error: "Message too long." }, { status: 400 });
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await db.from("feedback").insert({
      user_id:    authedUser?.id ?? null,
      user_email: authedUser?.email ?? null,
      type,
      rating:     type === "rating" ? ratingNum : null,
      verdict:    type === "analysis" ? verdict : null,
      message:    message || null,
    });

    if (dbError) {
      console.error("[feedback] DB insert failed:", dbError);
      return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
    }

    // Email notification (fire-and-forget — don't fail the user if email errors)
    // From address: prefer FEEDBACK_FROM env var (your verified Resend domain).
    // Falls back to Resend's onboarding@resend.dev which works without domain
    // verification — useful before you've set up your custom domain.
    const resendKey = process.env.RESEND_API_KEY;
    const adminEmails = (process.env.ADMIN_EMAIL ?? "").split(",").map(e => e.trim()).filter(Boolean);
    const fromAddr = process.env.FEEDBACK_FROM || "PathoLearn <onboarding@resend.dev>";
    const notifiable = type !== "rating" && type !== "analysis";
    if (resendKey && adminEmails.length > 0 && notifiable && authedUser) {
      try {
        const resend = new Resend(resendKey);
        const subject = `[PathoLearn] ${type.toUpperCase()} from ${authedUser.email}`;
        const html = `
          <h2>New ${type} feedback</h2>
          <p><strong>From:</strong> ${authedUser.email} (${authedUser.id})</p>
          <p><strong>Type:</strong> ${type}</p>
          <hr/>
          <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
        `;
        const { data: sendResult, error: sendError } = await resend.emails.send({
          from: fromAddr,
          to:   adminEmails,
          replyTo: authedUser.email,
          subject,
          html,
        });
        if (sendError) {
          console.error("[feedback] Resend rejected:", sendError);
        } else {
          console.log("[feedback] Email queued:", sendResult?.id);
        }
      } catch (emailErr) {
        console.error("[feedback] Resend threw (non-fatal):", emailErr);
      }
    } else if (notifiable) {
      console.warn("[feedback] Email skipped — RESEND_API_KEY or ADMIN_EMAIL missing");
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[feedback] Unexpected:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
