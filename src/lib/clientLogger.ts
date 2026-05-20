import { supabase } from "@/lib/supabase";

/**
 * Client-side error logger.
 * Forwards uncaught errors to /api/client-errors so the admin can review them.
 *
 * Includes a short in-memory throttle (per error signature) to avoid hammering
 * the endpoint when the same error fires repeatedly in a render loop.
 */

export type ErrorSource =
  | "window.error"
  | "unhandledrejection"
  | "ErrorBoundary"
  | "manual";

export interface ErrorPayload {
  message: string;
  stack?: string;
  source: ErrorSource;
  url?: string;
  metadata?: Record<string, unknown>;
}

const THROTTLE_MS = 30_000;
const MAX_RECENT = 100;
const recent = new Map<string, number>();

function signatureOf(p: ErrorPayload): string {
  const firstStackLine = (p.stack ?? "").split("\n").slice(0, 2).join("|");
  return `${p.source}::${p.message}::${firstStackLine}`.slice(0, 512);
}

function shouldSend(sig: string): boolean {
  const now = Date.now();
  const last = recent.get(sig) ?? 0;
  if (now - last < THROTTLE_MS) return false;
  recent.set(sig, now);
  // Bound the map so it doesn't grow forever on a long-running session
  if (recent.size > MAX_RECENT) {
    const oldestKey = recent.keys().next().value;
    if (oldestKey) recent.delete(oldestKey);
  }
  return true;
}

export async function logClientError(payload: ErrorPayload): Promise<void> {
  if (typeof window === "undefined") return;

  const signature = signatureOf(payload);
  if (!shouldSend(signature)) return;

  const body = JSON.stringify({
    ...payload,
    url: payload.url ?? window.location.href,
    user_agent: navigator.userAgent,
    signature,
  });

  let authHeader: string | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) authHeader = `Bearer ${session.access_token}`;
  } catch {
    // Auth lookup failed — send anonymously
  }

  try {
    await fetch("/api/client-errors", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body,
      keepalive: true,
    });
  } catch {
    // Swallow — logging the logger's failure would be ironic
  }
}
