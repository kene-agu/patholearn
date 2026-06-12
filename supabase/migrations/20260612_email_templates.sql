-- Admin-editable email templates for transactional emails.
-- Three kinds are seeded: welcome (post-signup), paid (post-subscribe),
-- cancelled (post-cancel). Admins can edit subject + html via the /admin
-- "Emails" tab; the sender library does {{variable}} substitution at send time.

create table if not exists public.email_templates (
  kind        text         primary key,
  subject     text         not null,
  html        text         not null,
  updated_at  timestamptz  not null default now()
);

alter table public.email_templates enable row level security;
-- No client policies on purpose: only the service role (server routes) touches this.

-- Track when each user was sent the welcome email so we don't send it twice.
-- Supabase fires SIGNED_IN on every login, not just on first signup.
alter table public.profiles
  add column if not exists welcomed_at timestamptz;

-- Backfill existing users so they don't suddenly get a "welcome" email on
-- their next sign-in — they're already past onboarding. Only new signups
-- from here on out (welcomed_at = NULL) will receive the welcome.
update public.profiles set welcomed_at = now() where welcomed_at is null;

-- Seed default copy. `on conflict do nothing` so reruns preserve any admin edits.
insert into public.email_templates (kind, subject, html) values
  (
    'welcome',
    'Welcome to PathoLearn 🔬',
    $TPL$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="40" height="40" style="display:inline-block;vertical-align:middle;border:0;">
          <span style="font-size:20px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:10px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;">Welcome aboard</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Hey {{name}}, welcome to PathoLearn 👋</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
            Your 14-day free trial is live. You have full access to AI slide analysis, the curated histopathology library, quizzes, flashcards, and Smart Learn — no card needed.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Easiest first step: upload one of your own lecture slides or pick a case from the curated library and let the AI walk you through the diagnosis.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="{{appUrl}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Open PathoLearn</a>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;padding:16px;">
            <tr><td>
              <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">What you get on trial</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;AI analysis of any slide you upload</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Curated histopathology library (44 cases)</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Flashcards, quiz mode, and Smart Learn from your PDFs</p>
              <p style="margin:0;font-size:14px;color:#475569;">✓ &nbsp;Progress tracking across devices</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Questions or feedback? Just reply to this email — it comes straight to me.<br>
            — Mathew, PathoLearn
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $TPL$
  ),
  (
    'paid',
    'Payment received — PathoLearn Premium is now active',
    $TPL$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="40" height="40" style="display:inline-block;vertical-align:middle;border:0;">
          <span style="font-size:20px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:10px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;">Premium active</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Thanks {{name}} — you're on Premium {{plan}} 👑</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your payment of <strong>{{amount}}</strong> went through and your subscription is active. Your card will be auto-charged on <strong>{{nextBilling}}</strong> for the next cycle — you can cancel anytime from your account.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;padding:16px;margin-bottom:24px;">
            <tr><td>
              <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">Receipt</p>
              <p style="margin:0 0 4px;font-size:14px;color:#475569;">Plan: <strong>{{plan}}</strong></p>
              <p style="margin:0 0 4px;font-size:14px;color:#475569;">Amount: <strong>{{amount}}</strong></p>
              <p style="margin:0;font-size:14px;color:#475569;">Next billing date: <strong>{{nextBilling}}</strong></p>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="{{appUrl}}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Open PathoLearn</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            You now have unlimited AI analyses, full quiz bank, Smart Learn on every PDF you upload, PDF export, and cross-device progress sync. Make the most of it — and ping me if anything feels off.
          </p>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Keep this email as your receipt. Need an invoice? Just reply.<br>
            — Mathew, PathoLearn
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $TPL$
  ),
  (
    'cancelled',
    'Your PathoLearn renewal is cancelled',
    $TPL$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="40" height="40" style="display:inline-block;vertical-align:middle;border:0;">
          <span style="font-size:20px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:10px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;padding:36px 32px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;">Cancellation confirmed</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">{{name}}, your renewal has been cancelled</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
            We've stopped your auto-renewal. You'll keep full Premium access until <strong>{{periodEnd}}</strong> — no further charges after that.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            If you change your mind, you can resubscribe anytime from the pricing page and pick up where you left off.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="{{appUrl}}/pricing" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Resubscribe anytime</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
            One quick favour: if there's something specific that didn't work for you — a missing feature, a bug, pricing, anything — would you hit reply and tell me? PathoLearn is built by one person (me) and that kind of feedback is gold.
          </p>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            Sorry to see you go. Door's always open.<br>
            — Mathew, PathoLearn
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $TPL$
  )
on conflict (kind) do nothing;
