import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.getpatholearn.com";

interface BroadcastBody {
  subject: string;
  previewText?: string;
  headline: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  preview?: boolean;
}

function buildHtml(body: BroadcastBody): string {
  const { headline, bodyText, ctaLabel, ctaUrl, imageUrl } = body;

  const imageBlock = imageUrl
    ? `<img src="${imageUrl}" alt="announcement" style="display:block;width:100%;max-width:600px;border-radius:12px;margin-bottom:24px;border:0;" />`
    : "";

  const ctaBlock =
    ctaLabel && ctaUrl
      ? `<table cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px;">
          <tr><td align="center">
            <a href="${ctaUrl}"
              style="display:inline-block;background:#0ea5e9;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;border:0;">
              ${ctaLabel}
            </a>
          </td></tr>
        </table>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#1e293b;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:36px 32px;">

          ${imageBlock}

          <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#0f172a;line-height:1.3;">
            ${headline}
          </h1>

          <p style="margin:0;font-size:15px;color:#475569;line-height:1.7;">
            ${bodyText}
          </p>

          ${ctaBlock}

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:28px 0 0;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#64748b;font-weight:600;letter-spacing:.04em;text-transform:uppercase;">
            AI-Powered Histopathology Learning
          </p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You're receiving this as a registered PathoLearn user.
            &nbsp;|&nbsp;
            <a href="${APP_URL}" style="color:#6366f1;text-decoration:none;">Visit PathoLearn</a>
            <br>
            <span style="color:#cbd5e1;">To unsubscribe, reply with "unsubscribe" in the subject line.</span>
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

  const body: BroadcastBody = await request.json();
  const { subject, previewText, headline, bodyText, preview } = body;

  if (!subject?.trim() || !headline?.trim() || !bodyText?.trim()) {
    return NextResponse.json(
      { error: "subject, headline, and bodyText are required" },
      { status: 400 }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromAddress = process.env.BROADCAST_FROM || "PathoLearn <onboarding@resend.dev>";
  const html = buildHtml(body);
  const emailSubject = previewText ? `${subject} — ${previewText}` : subject;

  // Preview mode — send only to the admin who called the endpoint
  if (preview) {
    const adminEmail = process.env.ADMIN_EMAIL?.split(",")[0]?.trim();
    if (!adminEmail) {
      return NextResponse.json({ error: "ADMIN_EMAIL not configured" }, { status: 500 });
    }
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: adminEmail,
      subject: `[PREVIEW] ${emailSubject}`,
      html,
    });
    if (error) {
      return NextResponse.json(
        { error: `Resend error: ${error.message ?? JSON.stringify(error)}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ sent: 1, preview: true, id: data?.id, to: adminEmail });
  }

  // Full broadcast — fetch all user emails via auth.users (paginated)
  const PAGE_SIZE = 1000;
  let page = 1;
  let allEmails: string[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data: { users }, error } = await db.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const emails = users.map(u => u.email).filter(Boolean) as string[];
    allEmails = allEmails.concat(emails);
    if (users.length < PAGE_SIZE) break;
    page++;
  }

  // Send in batches of 100 (Resend batch limit)
  const BATCH = 100;
  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < allEmails.length; i += BATCH) {
    const batch = allEmails.slice(i, i + BATCH);
    try {
      const { data, error } = await resend.batch.send(
        batch.map(email => ({
          from: fromAddress,
          to: email,
          subject: emailSubject,
          html,
        }))
      );
      if (error) {
        errors.push(`batch[${i}]: ${error.message ?? JSON.stringify(error)}`);
      } else {
        sent += data?.data?.length ?? batch.length;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`batch[${i}]: ${msg}`);
    }
    // Stay under Resend's 5 req/s limit
    if (i + BATCH < allEmails.length) {
      await new Promise(r => setTimeout(r, 250));
    }
  }

  return NextResponse.json({
    sent,
    total: allEmails.length,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
  });
}
