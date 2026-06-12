-- Visual refresh for all seven transactional email templates.
-- Split into seven standalone UPDATE statements so any per-template
-- parse issue stays isolated. Run as one block (or one statement at a
-- time) — each is independent and idempotent.

-- ── welcome ──
update public.email_templates set
  subject    = 'Welcome to PathoLearn 🔬',
  html       = $html_welcome$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="44" height="44" style="display:inline-block;vertical-align:middle;border-radius:10px;border:0;">
          <span style="font-size:21px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:12px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 32px rgba(99,102,241,0.14);">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#6366f1;background-image:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a855f7 100%);">
            <tr><td style="padding:40px 36px 32px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:.1em;">Welcome aboard 👋</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">Hey {{name}}, welcome to PathoLearn</h1>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 36px 36px;">
              <p style="margin:0 0 16px;font-size:15.5px;color:#334155;line-height:1.7;">
                Your 14-day free trial is live. You have full access to AI slide analysis, the curated histopathology library, quizzes, flashcards, and Smart Learn — no card needed.
              </p>
              <p style="margin:0 0 28px;font-size:15.5px;color:#334155;line-height:1.7;">
                Easiest first step: upload one of your own lecture slides or pick a case from the curated library and let the AI walk you through the diagnosis.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding-bottom:28px;">
                  <a href="{{appUrl}}" style="display:inline-block;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 6px 18px rgba(99,102,241,0.38);">Open PathoLearn</a>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                <tr><td style="padding:22px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;">What you get on trial</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;AI analysis of any slide you upload</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Curated histopathology library (44 cases)</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Flashcards, quiz mode, and Smart Learn from your PDFs</p>
                  <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Progress tracking across devices</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 16px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            Questions or feedback? Just reply to this email — it comes straight to me.<br>
            — Mathew, PathoLearn
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $html_welcome$,
  updated_at = now()
where kind = 'welcome';

-- ── paid ──
update public.email_templates set
  subject    = 'Payment received — PathoLearn Premium is now active',
  html       = $html_paid$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="44" height="44" style="display:inline-block;vertical-align:middle;border-radius:10px;border:0;">
          <span style="font-size:21px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:12px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 32px rgba(99,102,241,0.14);">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#6366f1;background-image:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a855f7 100%);">
            <tr><td style="padding:40px 36px 32px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:.1em;">Premium active 👑</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">Thanks {{name}} — you're on Premium {{plan}}</h1>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 36px 36px;">
              <p style="margin:0 0 28px;font-size:15.5px;color:#334155;line-height:1.7;">
                Your payment of <strong>{{amount}}</strong> went through and your subscription is active. Your card will be auto-charged on <strong>{{nextBilling}}</strong> for the next cycle — you can cancel anytime from your account.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:28px;">
                <tr><td style="padding:22px 24px;">
                  <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;">Receipt</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:6px 0;font-size:14px;color:#64748b;width:120px;">Plan</td><td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">{{plan}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:14px;color:#64748b;">Amount</td><td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">{{amount}}</td></tr>
                    <tr><td style="padding:6px 0;font-size:14px;color:#64748b;">Next billing</td><td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">{{nextBilling}}</td></tr>
                  </table>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding-bottom:24px;">
                  <a href="{{appUrl}}" style="display:inline-block;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 6px 18px rgba(99,102,241,0.38);">Open PathoLearn</a>
                </td></tr>
              </table>
              <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
                You now have unlimited AI analyses, full quiz bank, Smart Learn on every PDF you upload, PDF export, and cross-device progress sync. Make the most of it — and ping me if anything feels off.
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 16px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            Keep this email as your receipt. Need an invoice? Just reply.<br>
            — Mathew, PathoLearn
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $html_paid$,
  updated_at = now()
where kind = 'paid';

-- ── cancelled ──
update public.email_templates set
  subject    = 'Your PathoLearn renewal is cancelled',
  html       = $html_cancelled$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="44" height="44" style="display:inline-block;vertical-align:middle;border-radius:10px;border:0;">
          <span style="font-size:21px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:12px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 32px rgba(99,102,241,0.14);">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#6366f1;background-image:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a855f7 100%);">
            <tr><td style="padding:40px 36px 32px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:.1em;">Cancellation confirmed</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">{{name}}, your renewal has been cancelled</h1>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 36px 36px;">
              <p style="margin:0 0 16px;font-size:15.5px;color:#334155;line-height:1.7;">
                We've stopped your auto-renewal. You'll keep full Premium access until <strong>{{periodEnd}}</strong> — no further charges after that.
              </p>
              <p style="margin:0 0 28px;font-size:15.5px;color:#334155;line-height:1.7;">
                If you change your mind, you can resubscribe anytime from the pricing page and pick up where you left off.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding-bottom:28px;">
                  <a href="{{appUrl}}/pricing" style="display:inline-block;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 6px 18px rgba(99,102,241,0.38);">Resubscribe anytime</a>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#fef3c7;border-radius:12px;border:1px solid #fde68a;">
                <tr><td style="padding:18px 22px;">
                  <p style="margin:0;font-size:14px;color:#78350f;line-height:1.6;">
                    <strong>One quick favour:</strong> if there's something specific that didn't work for you — a missing feature, a bug, pricing, anything — would you hit reply and tell me? PathoLearn is built by one person (me) and that kind of feedback is gold.
                  </p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 16px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            Sorry to see you go. Door's always open.<br>
            — Mathew, PathoLearn
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $html_cancelled$,
  updated_at = now()
where kind = 'cancelled';

-- ── trial ──
update public.email_templates set
  subject    = '⏰ Your PathoLearn free trial ends {{urgency}}',
  html       = $html_trial$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="44" height="44" style="display:inline-block;vertical-align:middle;border-radius:10px;border:0;">
          <span style="font-size:21px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:12px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 32px rgba(99,102,241,0.14);">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#6366f1;background-image:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a855f7 100%);">
            <tr><td style="padding:40px 36px 32px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:.1em;">Trial ending soon ⏰</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">Hey {{name}}, your free trial ends {{urgency}}</h1>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 36px 36px;">
              <p style="margin:0 0 28px;font-size:15.5px;color:#334155;line-height:1.7;">
                Your PathoLearn free trial ends on <strong>{{endDate}}</strong>. Subscribe now to keep unlimited AI slide analysis, spaced repetition sync, PDF exports, and everything else you've been using.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding-bottom:28px;">
                  <a href="{{appUrl}}/pricing" style="display:inline-block;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 6px 18px rgba(99,102,241,0.38);">Subscribe now</a>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                <tr><td style="padding:22px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;">What you'll keep with Premium</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Unlimited AI slide analysis</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Cross-device spaced repetition</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;PDF export of every analysis</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Full progress &amp; confidence tracking</p>
                  <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Save cases to My Cases</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 16px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            You're receiving this because your PathoLearn free trial is ending soon.<br>
            Questions? Reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $html_trial$,
  updated_at = now()
where kind = 'trial';

-- ── trial-ended ──
update public.email_templates set
  subject    = 'Your PathoLearn trial has ended — pick up where you left off',
  html       = $html_trial_ended$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="44" height="44" style="display:inline-block;vertical-align:middle;border-radius:10px;border:0;">
          <span style="font-size:21px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:12px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 32px rgba(99,102,241,0.14);">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#6366f1;background-image:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a855f7 100%);">
            <tr><td style="padding:40px 36px 32px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:.1em;">Trial ended</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">{{name}}, your free trial has ended</h1>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 36px 36px;">
              <p style="margin:0 0 28px;font-size:15.5px;color:#334155;line-height:1.7;">
                Your PathoLearn free trial ended on <strong>{{endDate}}</strong>. Subscribe to pick up right where you left off — unlimited AI slide analysis, spaced repetition sync, PDF exports, and your full progress history are all waiting.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding-bottom:28px;">
                  <a href="{{appUrl}}/pricing" style="display:inline-block;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 6px 18px rgba(99,102,241,0.38);">Subscribe now</a>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                <tr><td style="padding:22px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;">What's waiting in Premium</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Unlimited AI slide analysis</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Cross-device spaced repetition</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;PDF export of every analysis</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Full progress &amp; confidence tracking</p>
                  <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Save cases to My Cases</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 16px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            You're receiving this because your PathoLearn free trial has ended.<br>
            Questions? Reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $html_trial_ended$,
  updated_at = now()
where kind = 'trial-ended';

-- ── premium ──
update public.email_templates set
  subject    = 'Your PathoLearn Premium expires {{urgency}}',
  html       = $html_premium$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="44" height="44" style="display:inline-block;vertical-align:middle;border-radius:10px;border:0;">
          <span style="font-size:21px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:12px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 32px rgba(99,102,241,0.14);">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#6366f1;background-image:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a855f7 100%);">
            <tr><td style="padding:40px 36px 32px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:.1em;">Subscription reminder ⏰</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">Hey {{name}}, your Premium expires {{urgency}}</h1>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 36px 36px;">
              <p style="margin:0 0 28px;font-size:15.5px;color:#334155;line-height:1.7;">
                Your PathoLearn Premium subscription ends on <strong>{{endDate}}</strong>. Renew now to keep access to unlimited AI slide analysis, spaced repetition sync, PDF exports, and everything else you've been using.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding-bottom:28px;">
                  <a href="{{appUrl}}/pricing" style="display:inline-block;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 6px 18px rgba(99,102,241,0.38);">Renew my subscription</a>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                <tr><td style="padding:22px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;">What you'll keep with Premium</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Unlimited AI slide analysis</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Cross-device spaced repetition</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;PDF export of every analysis</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Full progress &amp; confidence tracking</p>
                  <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Save cases to My Cases</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 16px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            You're receiving this because you have an active PathoLearn subscription.<br>
            Questions? Reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $html_premium$,
  updated_at = now()
where kind = 'premium';

-- ── premium-ended ──
update public.email_templates set
  subject    = 'Your PathoLearn Premium has ended — resubscribe to keep your access',
  html       = $html_premium_ended$
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding-bottom:24px;text-align:center;">
          <img src="https://getpatholearn.com/icon-192.png" alt="" width="44" height="44" style="display:inline-block;vertical-align:middle;border-radius:10px;border:0;">
          <span style="font-size:21px;font-weight:700;color:#1e293b;vertical-align:middle;margin-left:12px;">
            Patho<span style="color:#6366f1;">Learn</span>
          </span>
        </td></tr>
        <tr><td style="border-radius:18px;overflow:hidden;background:#ffffff;box-shadow:0 10px 32px rgba(99,102,241,0.14);">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#6366f1;background-image:linear-gradient(135deg,#6366f1 0%,#8b5cf6 60%,#a855f7 100%);">
            <tr><td style="padding:40px 36px 32px;">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.85);text-transform:uppercase;letter-spacing:.1em;">Subscription ended</p>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;letter-spacing:-0.01em;">{{name}}, your Premium has ended</h1>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:32px 36px 36px;">
              <p style="margin:0 0 28px;font-size:15.5px;color:#334155;line-height:1.7;">
                Your PathoLearn Premium subscription ended on <strong>{{endDate}}</strong>. Resubscribe to pick up where you left off — unlimited AI slide analysis, spaced repetition sync, PDF exports, and your full progress history are all waiting.
              </p>
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr><td align="center" style="padding-bottom:28px;">
                  <a href="{{appUrl}}/pricing" style="display:inline-block;background:#6366f1;background-image:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:15px 40px;border-radius:12px;box-shadow:0 6px 18px rgba(99,102,241,0.38);">Resubscribe now</a>
                </td></tr>
              </table>
              <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
                <tr><td style="padding:22px 24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;">What's waiting in Premium</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Unlimited AI slide analysis</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Cross-device spaced repetition</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;PDF export of every analysis</p>
                  <p style="margin:0 0 8px;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Full progress &amp; confidence tracking</p>
                  <p style="margin:0;font-size:14px;color:#475569;line-height:1.5;"><span style="color:#10b981;font-weight:700;">✓</span>&nbsp;&nbsp;Save cases to My Cases</p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:28px 16px 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
            You're receiving this because your PathoLearn Premium has ended.<br>
            Questions? Reply to this email.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    $html_premium_ended$,
  updated_at = now()
where kind = 'premium-ended';
