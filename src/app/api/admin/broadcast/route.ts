import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.getpatholearn.com";

function wrapHtml(subject: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:20px;font-weight:700;color:#1e293b;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:36px 32px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You're receiving this as a registered PathoLearn user.<br>
            <a href="${APP_URL}" style="color:#6366f1;text-decoration:none;">Visit PathoLearn</a>
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

  const { subject, body, preview } = await request.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const resend = new Resend(process.env.RESEND_API_KEY!);

  // Preview mode — only send to admin email
  if (preview) {
    const { data: { users } } = await db.auth.admin.listUsers({ page: 1, perPage: 1 });
    const adminEmail = users[0]?.email;
    if (!adminEmail) return NextResponse.json({ error: "Could not find admin email" }, { status: 500 });

    await resend.emails.send({
      from:    "PathoLearn <onboarding@resend.dev>",
      to:      adminEmail,
      subject: `[PREVIEW] ${subject}`,
      html:    wrapHtml(subject, body),
    });
    return NextResponse.json({ sent: 1, preview: true });
  }

  // Full broadcast — fetch all users in pages
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

  // Resend batch send (max 100 per call)
  const BATCH = 100;
  let sent = 0;
  const errors: string[] = [];

  for (let i = 0; i < allEmails.length; i += BATCH) {
    const batch = allEmails.slice(i, i + BATCH);
    await Promise.all(
      batch.map(async email => {
        try {
          await resend.emails.send({
            from:    "PathoLearn <onboarding@resend.dev>",
            to:      email,
            subject,
            html:    wrapHtml(subject, body),
          });
          sent++;
        } catch (e) {
          errors.push(`${email}: ${e}`);
        }
      })
    );
  }

  return NextResponse.json({ sent, total: allEmails.length, errors: errors.length > 0 ? errors.slice(0, 10) : undefined });
}
