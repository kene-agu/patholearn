import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type Segment = "all" | "trialing" | "active" | "expired" | "canceled";

function buildHtml(subject: string, body: string): string {
  const paragraphs = body
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">${line}</p>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:20px;font-weight:700;color:#1e293b;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>

        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:36px 32px;">
          <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">${subject}</h1>
          ${paragraphs}
        </td></tr>

        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You're receiving this from the PathoLearn team.<br>
            Questions? Reply to this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, body, segment = "all" } = await request.json() as {
    subject: string;
    body: string;
    segment?: Segment;
  };

  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and body are required." }, { status: 400 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = db.from("profiles").select("email");
  if (segment !== "all") {
    query = query.eq("subscription_status", segment);
  }

  const { data: profiles, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!profiles?.length) return NextResponse.json({ sent: 0, failed: 0, total: 0 });

  const resend = new Resend(process.env.RESEND_API_KEY!);
  const html = buildHtml(subject, body);
  let sent = 0;
  let failed = 0;

  for (const profile of profiles) {
    if (!profile.email) { failed++; continue; }
    try {
      await resend.emails.send({
        from:    "PathoLearn <onboarding@resend.dev>",
        to:      profile.email,
        subject,
        html,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ sent, failed, total: profiles.length });
}
