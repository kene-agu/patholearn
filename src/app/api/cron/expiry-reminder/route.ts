import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://patholearn-six.vercel.app";
// Resend only delivers from onboarding@resend.dev to your own account email.
// Set RESEND_FROM to an address on a verified domain to reach real users.
const FROM_EMAIL = process.env.RESEND_FROM || "PathoLearn <onboarding@resend.dev>";
const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderKind = "premium" | "trial" | "trial-ended";

interface Reminder {
  id: string;
  kind: ReminderKind;
  endIso: string;
  daysLeft: number;
}

// Whole-day difference between two dates, ignoring time-of-day, so a given
// reminder lands on exactly one daily cron run regardless of signup time.
function dayDiffUTC(a: Date, b: Date): number {
  const am = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bm = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((am - bm) / DAY_MS);
}

function subjectFor(kind: ReminderKind, daysLeft: number): string {
  if (kind === "premium") {
    return daysLeft === 1
      ? "⏰ Your PathoLearn Premium expires tomorrow"
      : `Your PathoLearn Premium expires in ${daysLeft} days`;
  }
  if (kind === "trial") {
    return daysLeft === 1
      ? "⏰ Your PathoLearn free trial ends tomorrow"
      : `Your PathoLearn free trial ends in ${daysLeft} days`;
  }
  return "Your PathoLearn trial has ended — pick up where you left off";
}

function emailHtml(kind: ReminderKind, daysLeft: number, endIso: string): string {
  const date = new Date(endIso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
  const urgency = daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;

  let label: string, heading: string, body: string, cta: string, featuresTitle: string, footer: string;

  if (kind === "premium") {
    label = "Subscription reminder";
    heading = `Your Premium access expires ${urgency}`;
    body = `Your PathoLearn Premium subscription ends on <strong>${date}</strong>.
      Renew now to keep access to unlimited AI slide analysis, spaced repetition sync, PDF exports, and everything else you've been using.`;
    cta = "Renew my subscription";
    featuresTitle = "What you'll keep with Premium";
    footer = "You're receiving this because you have an active PathoLearn subscription.";
  } else if (kind === "trial") {
    label = "Trial ending soon";
    heading = `Your free trial ends ${urgency}`;
    body = `Your PathoLearn free trial ends on <strong>${date}</strong>.
      Subscribe now to keep unlimited AI slide analysis, spaced repetition sync, PDF exports, and everything else you've been using.`;
    cta = "Subscribe now";
    featuresTitle = "What you'll keep with Premium";
    footer = "You're receiving this because your PathoLearn free trial is ending soon.";
  } else {
    label = "Trial ended";
    heading = "Your free trial has ended";
    body = `Your PathoLearn free trial ended on <strong>${date}</strong>.
      Subscribe to pick up right where you left off — unlimited AI slide analysis, spaced repetition sync, PDF exports, and your full progress history.`;
    cta = "Subscribe now";
    featuresTitle = "What's waiting in Premium";
    footer = "You're receiving this because your PathoLearn free trial has ended.";
  }

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
            ${label}
          </p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
            ${heading}
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            ${body}
          </p>

          <!-- CTA -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="${APP_URL}/pricing"
                style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">
                ${cta}
              </a>
            </td></tr>
          </table>

          <!-- Features reminder -->
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;padding:16px;">
            <tr><td>
              <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">${featuresTitle}</p>
              ${["Unlimited AI slide analysis", "Cross-device spaced repetition", "PDF export of every analysis", "Full progress & confidence tracking", "Save cases to My Cases"].map(f =>
                `<p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;${f}</p>`
              ).join("")}
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            ${footer}<br>
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
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const now = new Date();
    const reminders: Reminder[] = [];

    // ── Premium subscriptions expiring in 1–3 days ──
    const in1 = new Date(now); in1.setDate(in1.getDate() + 1);
    const in3 = new Date(now); in3.setDate(in3.getDate() + 3);
    const in1s = in1.toISOString().slice(0, 10);
    const in3s = in3.toISOString().slice(0, 10);

    const { data: premium, error: premiumErr } = await supabaseAdmin
      .from("profiles")
      .select("id, current_period_end")
      .eq("subscription_status", "active")
      .gte("current_period_end", `${in1s}T00:00:00Z`)
      .lte("current_period_end", `${in3s}T23:59:59Z`);
    if (premiumErr) throw premiumErr;

    for (const p of premium ?? []) {
      if (!p.current_period_end) continue;
      const daysLeft = Math.ceil((new Date(p.current_period_end).getTime() - now.getTime()) / DAY_MS);
      reminders.push({ id: p.id, kind: "premium", endIso: p.current_period_end, daysLeft });
    }

    // ── Trials: ending in 1–3 days, or ended yesterday (win-back) ──
    // Trial end = trial_started_at + 14 days (trials have no current_period_end).
    // Pull a padded window of trialing signups, then bucket each by exact day diff.
    const winLo = new Date(now.getTime() - 16 * DAY_MS).toISOString().slice(0, 10);
    const winHi = new Date(now.getTime() - 10 * DAY_MS).toISOString().slice(0, 10);

    const { data: trials, error: trialErr } = await supabaseAdmin
      .from("profiles")
      .select("id, trial_started_at")
      .eq("subscription_status", "trialing")
      .gte("trial_started_at", `${winLo}T00:00:00Z`)
      .lte("trial_started_at", `${winHi}T23:59:59Z`);
    if (trialErr) throw trialErr;

    for (const p of trials ?? []) {
      if (!p.trial_started_at) continue;
      const trialEnd = new Date(new Date(p.trial_started_at).getTime() + TRIAL_DAYS * DAY_MS);
      const diff = dayDiffUTC(trialEnd, now); // +3..+1 = days left, -1 = ended yesterday
      if (diff >= 1 && diff <= 3) {
        reminders.push({ id: p.id, kind: "trial", endIso: trialEnd.toISOString(), daysLeft: diff });
      } else if (diff === -1) {
        reminders.push({ id: p.id, kind: "trial-ended", endIso: trialEnd.toISOString(), daysLeft: 0 });
      }
    }

    if (reminders.length === 0) {
      return NextResponse.json({ sent: 0, message: "No reminders to send today" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY!);
    let sent = 0;
    const errors: string[] = [];

    for (const r of reminders) {
      // Get email from auth.users
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(r.id);
      const email = user?.email;
      if (!email) continue;

      try {
        await resend.emails.send({
          from:    FROM_EMAIL,
          to:      email,
          subject: subjectFor(r.kind, r.daysLeft),
          html:    emailHtml(r.kind, r.daysLeft, r.endIso),
        });
        sent++;
      } catch (emailErr) {
        errors.push(`${email}: ${emailErr}`);
      }
    }

    const counts = {
      premium:     reminders.filter(r => r.kind === "premium").length,
      trialEnding: reminders.filter(r => r.kind === "trial").length,
      trialEnded:  reminders.filter(r => r.kind === "trial-ended").length,
    };
    console.log(`Expiry reminder: ${sent} sent, ${errors.length} failed`, counts);
    return NextResponse.json({ sent, ...counts, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error("Expiry reminder cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
