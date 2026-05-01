import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

const VALID_TYPES = new Set(["bug", "feature", "question", "other", "rating"]);
const MAX_MESSAGE = 4000;

export async function POST(request: NextRequest) {
  try {
    const authedUser = await verifyUser(request.headers.get("authorization"));
    if (!authedUser) {
      return NextResponse.json({ error: "Sign in to send feedback." }, { status: 401 });
    }

    const body = await request.json();
    const type = String(body.type ?? "").trim();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const ratingNum = body.rating != null ? Number(body.rating) : null;

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: "Invalid feedback type." }, { status: 400 });
    }
    if (type === "rating") {
      if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
        return NextResponse.json({ error: "Rating must be 1-5." }, { status: 400 });
      }
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
      user_id:    authedUser.id,
      user_email: authedUser.email ?? null,
      type,
      rating:     type === "rating" ? ratingNum : null,
      message:    message || null,
    });

    if (dbError) {
      console.error("[feedback] DB insert failed:", dbError);
      return NextResponse.json({ error: "Failed to save feedback." }, { status: 500 });
    }

    // Email notification (fire-and-forget — don't fail the user if email errors)
    const resendKey = process.env.RESEND_API_KEY;
    const adminEmails = (process.env.ADMIN_EMAIL ?? "").split(",").map(e => e.trim()).filter(Boolean);
    if (resendKey && adminEmails.length > 0 && type !== "rating") {
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
        await resend.emails.send({
          from: "PathoLearn <feedback@patholearn.app>",
          to:   adminEmails,
          replyTo: authedUser.email,
          subject,
          html,
        });
      } catch (emailErr) {
        console.error("[feedback] Resend failed (non-fatal):", emailErr);
      }
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
