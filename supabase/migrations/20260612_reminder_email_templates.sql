-- Move the four expiry-reminder emails (trial, trial-ended, premium,
-- premium-ended) into the same admin-editable email_templates table so all
-- seven transactional emails share one editing flow at /admin/Emails.
--
-- These were previously hardcoded in src/app/api/cron/expiry-reminder/route.ts.
-- Seeded with the same wording the cron used to send. `on conflict do nothing`
-- preserves any admin edits if this migration is replayed.

insert into public.email_templates (kind, subject, html) values
  (
    'trial',
    '⏰ Your PathoLearn free trial ends {{urgency}}',
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
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;">Trial ending soon</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Hey {{name}}, your free trial ends {{urgency}}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your PathoLearn free trial ends on <strong>{{endDate}}</strong>. Subscribe now to keep unlimited AI slide analysis, spaced repetition sync, PDF exports, and everything else you've been using.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="{{appUrl}}/pricing" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Subscribe now</a>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;padding:16px;">
            <tr><td>
              <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">What you'll keep with Premium</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Unlimited AI slide analysis</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Cross-device spaced repetition</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;PDF export of every analysis</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Full progress &amp; confidence tracking</p>
              <p style="margin:0;font-size:14px;color:#475569;">✓ &nbsp;Save cases to My Cases</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You're receiving this because your PathoLearn free trial is ending soon.<br>
            Questions? Reply to this email.
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
    'trial-ended',
    'Your PathoLearn trial has ended — pick up where you left off',
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
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;">Trial ended</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">{{name}}, your free trial has ended</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your PathoLearn free trial ended on <strong>{{endDate}}</strong>. Subscribe to pick up right where you left off — unlimited AI slide analysis, spaced repetition sync, PDF exports, and your full progress history.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="{{appUrl}}/pricing" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Subscribe now</a>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;padding:16px;">
            <tr><td>
              <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">What's waiting in Premium</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Unlimited AI slide analysis</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Cross-device spaced repetition</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;PDF export of every analysis</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Full progress &amp; confidence tracking</p>
              <p style="margin:0;font-size:14px;color:#475569;">✓ &nbsp;Save cases to My Cases</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You're receiving this because your PathoLearn free trial has ended.<br>
            Questions? Reply to this email.
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
    'premium',
    'Your PathoLearn Premium expires {{urgency}}',
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
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;">Subscription reminder</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Hey {{name}}, your Premium access expires {{urgency}}</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your PathoLearn Premium subscription ends on <strong>{{endDate}}</strong>. Renew now to keep access to unlimited AI slide analysis, spaced repetition sync, PDF exports, and everything else you've been using.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="{{appUrl}}/pricing" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Renew my subscription</a>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;padding:16px;">
            <tr><td>
              <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">What you'll keep with Premium</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Unlimited AI slide analysis</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Cross-device spaced repetition</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;PDF export of every analysis</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Full progress &amp; confidence tracking</p>
              <p style="margin:0;font-size:14px;color:#475569;">✓ &nbsp;Save cases to My Cases</p>
            </td></tr>
          </table>
        </td></tr>
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
</html>
    $TPL$
  ),
  (
    'premium-ended',
    'Your PathoLearn Premium has ended — resubscribe to keep your access',
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
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;">Subscription ended</p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">{{name}}, your Premium access has ended</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
            Your PathoLearn Premium subscription ended on <strong>{{endDate}}</strong>. Resubscribe to pick up where you left off — unlimited AI slide analysis, spaced repetition sync, PDF exports, and your full progress history are all waiting.
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="{{appUrl}}/pricing" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Resubscribe now</a>
            </td></tr>
          </table>
          <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8fafc;border-radius:10px;padding:16px;">
            <tr><td>
              <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">What's waiting in Premium</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Unlimited AI slide analysis</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Cross-device spaced repetition</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;PDF export of every analysis</p>
              <p style="margin:0 0 6px;font-size:14px;color:#475569;">✓ &nbsp;Full progress &amp; confidence tracking</p>
              <p style="margin:0;font-size:14px;color:#475569;">✓ &nbsp;Save cases to My Cases</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 0 0;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            You're receiving this because your PathoLearn Premium has ended.<br>
            Questions? Reply to this email.
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
