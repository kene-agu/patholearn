import { Resend } from "resend";

/**
 * Server-side helper that emails the admin(s) when something fails on a critical
 * path (e.g. slide analysis). Fire-and-forget and fully self-contained:
 *
 *  - No-ops cleanly if RESEND_API_KEY or ADMIN_EMAIL is unset (logs a warning).
 *  - Never throws — callers can `void alertAdminError(...)` without a try/catch.
 *  - Throttled per `context` so a sustained outage can't flood your inbox.
 *
 * Reuses the same Resend setup as the feedback route. Set ERROR_ALERT_FROM (or
 * FEEDBACK_FROM) to a verified domain; otherwise falls back to Resend's
 * onboarding sender which works without domain verification.
 */

// In-memory throttle. Serverless instances are short-lived, so this caps bursts
// within a single warm instance rather than guaranteeing global rate-limiting —
// enough to stop a hot loop from sending hundreds of identical emails.
const lastSentAt = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000; // at most one alert per context per 5 min

interface AlertOptions {
  /** Short label for the failing area, e.g. "analyze". Used for throttling + subject. */
  context: string;
  /** One-line human summary of what went wrong. */
  summary: string;
  /** The underlying error (or anything) — stringified into the email body. */
  error?: unknown;
  /** Optional extra key/value context (userId, model, ip, etc.). */
  details?: Record<string, string | number | null | undefined>;
}

export async function alertAdminError({ context, summary, error, details }: AlertOptions): Promise<void> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    const adminEmails = (process.env.ADMIN_EMAIL ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    if (!resendKey || adminEmails.length === 0) {
      console.warn(`[alertAdminError:${context}] Skipped — RESEND_API_KEY or ADMIN_EMAIL missing`);
      return;
    }

    const now = Date.now();
    const last = lastSentAt.get(context) ?? 0;
    if (now - last < THROTTLE_MS) {
      console.warn(`[alertAdminError:${context}] Throttled — alert sent <5 min ago`);
      return;
    }
    lastSentAt.set(context, now);

    const fromAddr =
      process.env.ERROR_ALERT_FROM ||
      process.env.FEEDBACK_FROM ||
      "PathoLearn Alerts <onboarding@resend.dev>";

    const errText =
      error instanceof Error
        ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}`
        : error != null
        ? String(error)
        : "(no error object)";

    const detailRows = Object.entries(details ?? {})
      .map(([k, v]) => `<tr><td style="padding:2px 8px;font-weight:600;">${escapeHtml(k)}</td><td style="padding:2px 8px;">${escapeHtml(String(v ?? "—"))}</td></tr>`)
      .join("");

    const html = `
      <h2>⚠️ PathoLearn error — ${escapeHtml(context)}</h2>
      <p>${escapeHtml(summary)}</p>
      ${detailRows ? `<table style="border-collapse:collapse;font-size:13px;margin:12px 0;">${detailRows}</table>` : ""}
      <p style="font-weight:600;margin-bottom:4px;">Error</p>
      <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:6px;font-size:12px;">${escapeHtml(errText)}</pre>
      <p style="color:#888;font-size:12px;">Sent ${new Date().toISOString()} · further "${escapeHtml(context)}" alerts muted for 5 min.</p>
    `;

    const resend = new Resend(resendKey);
    const { error: sendError } = await resend.emails.send({
      from: fromAddr,
      to: adminEmails,
      subject: `[PathoLearn] ⚠️ ${context} error — ${summary}`.slice(0, 120),
      html,
    });
    if (sendError) {
      console.error(`[alertAdminError:${context}] Resend rejected:`, sendError);
    }
  } catch (e) {
    // Must never throw — alerting failures should not break the request.
    console.error(`[alertAdminError:${context}] threw (non-fatal):`, e);
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
