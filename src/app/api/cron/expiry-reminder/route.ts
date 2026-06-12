import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendTemplatedEmail } from "@/lib/sendTemplatedEmail";

export const dynamic = "force-dynamic";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.getpatholearn.com";
const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

type ReminderKind = "premium" | "premium-ended" | "trial" | "trial-ended";

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

function formatEndDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });
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
    // Skip users with flw_subscription_id whose status is still "active" —
    // Flutterwave will auto-charge their card, no reminder needed. Canceled
    // users (recurring turned off) still get the heads-up.
    const in1 = new Date(now); in1.setDate(in1.getDate() + 1);
    const in3 = new Date(now); in3.setDate(in3.getDate() + 3);
    const in1s = in1.toISOString().slice(0, 10);
    const in3s = in3.toISOString().slice(0, 10);

    const { data: premium, error: premiumErr } = await supabaseAdmin
      .from("profiles")
      .select("id, current_period_end, subscription_status, flw_subscription_id")
      .in("subscription_status", ["active", "canceled"])
      .gte("current_period_end", `${in1s}T00:00:00Z`)
      .lte("current_period_end", `${in3s}T23:59:59Z`);
    if (premiumErr) throw premiumErr;

    for (const p of premium ?? []) {
      if (!p.current_period_end) continue;
      // Auto-renewal will charge them; don't nag.
      if (p.subscription_status === "active" && p.flw_subscription_id) continue;
      const daysLeft = dayDiffUTC(new Date(p.current_period_end), now);
      reminders.push({ id: p.id, kind: "premium", endIso: p.current_period_end, daysLeft });
    }

    // ── Premium subscriptions whose period_end was yesterday ──
    // Recurring failed (card declined etc.) OR a canceled sub finally lapsed
    // OR a one-time payment user didn't repay. Email them once, then flip
    // status → "expired" so the UI reflects it and we don't re-email.
    const yesterdayStart = new Date(now.getTime() - DAY_MS).toISOString().slice(0, 10);
    const todayStart     = new Date(now.getTime()).toISOString().slice(0, 10);

    const { data: ended, error: endedErr } = await supabaseAdmin
      .from("profiles")
      .select("id, current_period_end")
      .in("subscription_status", ["active", "canceled"])
      .gte("current_period_end", `${yesterdayStart}T00:00:00Z`)
      .lt("current_period_end",  `${todayStart}T00:00:00Z`);
    if (endedErr) throw endedErr;

    const expiredIds: string[] = [];
    for (const p of ended ?? []) {
      if (!p.current_period_end) continue;
      reminders.push({ id: p.id, kind: "premium-ended", endIso: p.current_period_end, daysLeft: 0 });
      expiredIds.push(p.id);
    }
    if (expiredIds.length > 0) {
      const { error: expireErr } = await supabaseAdmin
        .from("profiles")
        .update({ subscription_status: "expired" })
        .in("id", expiredIds);
      if (expireErr) console.error("Failed to mark profiles expired:", expireErr);
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

    let sent = 0;
    const errors: string[] = [];

    for (const r of reminders) {
      // Look up email + display name from auth.users.
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(r.id);
      const email = user?.email;
      if (!email) continue;
      const name = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] || "there";

      const urgency = r.daysLeft === 1 ? "tomorrow" : `in ${r.daysLeft} days`;
      const endDate = formatEndDate(r.endIso);

      try {
        await sendTemplatedEmail({
          kind: r.kind,
          to: email,
          variables: { name, urgency, endDate, appUrl: APP_URL },
          context: `cron-${r.kind}`,
        });
        sent++;
      } catch (emailErr) {
        errors.push(`${email}: ${emailErr}`);
      }
    }

    const counts = {
      premium:       reminders.filter(r => r.kind === "premium").length,
      premiumEnded:  reminders.filter(r => r.kind === "premium-ended").length,
      trialEnding:   reminders.filter(r => r.kind === "trial").length,
      trialEnded:    reminders.filter(r => r.kind === "trial-ended").length,
    };
    console.log(`Expiry reminder: ${sent} sent, ${errors.length} failed`, counts);
    return NextResponse.json({ sent, ...counts, errors: errors.length > 0 ? errors : undefined });
  } catch (err) {
    console.error("Expiry reminder cron error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
