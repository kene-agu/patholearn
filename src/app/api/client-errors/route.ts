import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { verifyUser } from "@/lib/userAuth";

export const dynamic = "force-dynamic";

const VALID_SOURCES = new Set([
  "window.error",
  "unhandledrejection",
  "ErrorBoundary",
  "manual",
]);

const MAX_MESSAGE = 2000;
const MAX_STACK   = 8000;
const MAX_URL     = 2000;
const MAX_UA      = 1000;
const MAX_SIG     = 512;

function trim(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!v) return null;
  return v.length > max ? v.slice(0, max) : v;
}

export async function POST(request: NextRequest) {
  try {
    // Auth is OPTIONAL — anonymous visitors can also hit errors and we want
    // to capture those too. If the header is present we attach the user.
    const user = await verifyUser(request.headers.get("authorization"));

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const message = trim(body.message, MAX_MESSAGE);
    if (!message) {
      return NextResponse.json({ error: "Missing message." }, { status: 400 });
    }

    const source = String(body.source ?? "manual");
    if (!VALID_SOURCES.has(source)) {
      return NextResponse.json({ error: "Invalid source." }, { status: 400 });
    }

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await db.from("client_errors").insert({
      user_id:    user?.id ?? null,
      user_email: user?.email ?? null,
      message,
      stack:      trim(body.stack, MAX_STACK),
      source,
      url:        trim(body.url, MAX_URL),
      user_agent: trim(body.user_agent, MAX_UA),
      metadata,
      signature:  trim(body.signature, MAX_SIG),
    });

    if (dbError) {
      console.error("[client-errors] DB insert failed:", dbError);
      return NextResponse.json({ error: "Failed to save error." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[client-errors] Unexpected:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
