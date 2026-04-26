import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://patholearn-six.vercel.app";

function emailHtml(email: string, daysLeft: number, periodEnd: string): string {
  const date = new Date(periodEnd).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const urgency = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td style="padding-bottom:24px;text-align:center;">
          <span style="font-size:20px;font-weight:700;color:#1e293b;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:36px 32px;">

          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;">
            Subscription reminder
          </p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
            Your Premium access expires ${urgency}
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your PathoLearn Premium subscription ends on <strong>${date}</strong>.
            Renew now to keep access to unlimited AI slide analysis, spaced repetition sync, PDF exports, and everything else you've been using.
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="${APP_URL}/pricing"
                style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">
                Renew my subscription
              </a>
            </td></tr>
          </table>

          <!-- Features reminder -->
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;padding:16px;">
            <tr><td>
              <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">What you'll keep with Premium</p>
              ${["Unlimited AI slide analysis", "Cross-device spaced repetition", "PDF export of every analysis", "Full progress & confidence tracking", "Save cases to My Cases"].map(f =>
                `<p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;${f}</p>`
              ).join("")}
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You're receiving this because you have an active PathoLearn subscription.<br>
            Questions? Reply to this email.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  // Protect the endpoint — Vercel signs cron requests, but add a secret for manual calls too
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now   = new Date();
    const in1   = new Date(now); in1.setDate(in1.getDate() + 1);
    const in3   = new Date(now); in3.setDate(in3.getDate() + 3);
    const in1s  = in1.toISOString().slice(0, 10);
    const in3s  = in3.toISOString().slice(0, 10);

    // Fetch profiles expiring in 1–3 days
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("id, current_period_end")
      .eq("subscription_status", "active")
      .gte("current_period_end", `${in1s}T00:00:00Z`)
      .lte("current_period_end", `${in3s}T23:59:59Z`);

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ sent: 0, message: "No expiring subscriptions today" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    let sent = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      // Get email from auth.users
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      const email = user?.email;
      if (!email) continue;

      const periodEnd = new Date(profile.current_period_end);
      const daysLeft  = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      try {
        await resend.emails.send({
          from:    "PathoLearn <onboarding@resend.dev>",
          to:      email,
          subject: daysLeft === 1
            ? "⏰ Your PathoLearn Premium expires tomorrow"
            : `Your PathoLearn Premium expires in ${daysLeft} days`,
          html: emailHtml(email, daysLeft, profile.current_period_end),
        });
        sent++;
      } catch (emailErr) {
        errors.push(`${email}: ${emailErr}`);
      }
    }

    console.log(`Expiry reminder: ${sent} sent, ${errors.length} failed`);
    return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error("Expiry reminder cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
