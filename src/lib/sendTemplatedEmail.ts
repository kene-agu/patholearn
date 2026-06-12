import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { alertAdminError } from "./alertAdminError";

const FROM_EMAIL = process.env.RESEND_FROM || "PathoLearn <hello@getpatholearn.com>";

type TemplateKind = "welcome" | "paid" | "cancelled" | "trial" | "trial-ended" | "premium" | "premium-ended";

function fillVariables(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

interface SendOptions {
  kind: TemplateKind;
  to: string;
  variables: Record<string, string>;
  /** Short context string for admin error alerts (e.g. "post-subscribe"). */
  context?: string;
}

/**
 * Fetches an admin-editable template from `email_templates`, fills its
 * {{variables}}, and sends via Resend. Fire-and-forget friendly — never
 * throws (callers can `void sendTemplatedEmail(...)`). Alerts admin on failure
 * so a broken template doesn't silently drop user-facing emails.
 */
export async function sendTemplatedEmail({ kind, to, variables, context }: SendOptions): Promise<void> {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn(`[sendTemplatedEmail:${kind}] Skipped — RESEND_API_KEY missing`);
      return;
    }

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tpl, error: tplErr } = await db
      .from("email_templates")
      .select("subject, html")
      .eq("kind", kind)
      .single();

    if (tplErr || !tpl) {
      console.error(`[sendTemplatedEmail:${kind}] Template missing:`, tplErr);
      void alertAdminError({
        context: `email-${kind}`,
        summary: `Template "${kind}" missing or unreadable — ${context ?? "user-facing"} email not sent`,
        error: tplErr ?? "no template row",
        details: { to, kind },
      });
      return;
    }

    const subject = fillVariables(tpl.subject, variables);
    const html    = fillVariables(tpl.html, variables);

    const resend = new Resend(resendKey);
    const { error: sendErr } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (sendErr) {
      console.error(`[sendTemplatedEmail:${kind}] Resend rejected:`, sendErr);
      void alertAdminError({
        context: `email-${kind}`,
        summary: `Resend rejected the "${kind}" email — user did not receive ${context ?? "transactional"} email`,
        error: sendErr,
        details: { to, kind },
      });
    }
  } catch (err) {
    console.error(`[sendTemplatedEmail:${kind}] threw (non-fatal):`, err);
  }
}
