import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { verifyAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

const FROM_EMAIL = process.env.RESEND_FROM || "PathoLearn <hello@getpatholearn.com>";

interface DirectBody {
  to: string;
  subject: string;
  bodyText: string;
}

// Turn a plain-text body into minimal HTML:
//   - blank lines split paragraphs
//   - single newlines become <br>
//   - **bold** and *italic* honoured (lightweight markdown)
// Keeps the email looking personal — no marketing wrapper, no unsub footer.
function paragraphsFromText(text: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const markdown = (s: string) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((para) => `<p style="margin:0 0 16px;">${markdown(escape(para)).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function buildHtml(bodyText: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:32px 16px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#334155;line-height:1.7;font-size:15.5px;">
  <div style="max-width:560px;margin:0 auto;">
    ${paragraphsFromText(bodyText)}
  </div>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  if (!await verifyAdmin(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: DirectBody = await request.json();
  const to       = body.to?.trim();
  const subject  = body.subject?.trim();
  const bodyText = body.bodyText?.trim();

  if (!to || !subject || !bodyText) {
    return NextResponse.json(
      { error: "to, subject, and bodyText are required" },
      { status: 400 }
    );
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return NextResponse.json({ error: "to must be a valid email address" }, { status: 400 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: buildHtml(bodyText),
  });
  if (error) {
    return NextResponse.json(
      { error: `Resend error: ${error.message ?? JSON.stringify(error)}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ sent: true, id: data?.id, to });
}
