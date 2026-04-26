import { NextRequest, NextResponse } from "next/server";

// ── Rate limiter ──────────────────────────────────────────────────────────────
// Sliding-window counter keyed by IP + route.
// Limits per route (requests / window):
//   /api/subscribe       → 5  per 60 s  (payment initiation)
//   /api/validate-coupon → 10 per 60 s  (coupon brute-force prevention)
//   /api/verify-payment  → 10 per 60 s  (payment verification)
//   /api/analyze         → 20 per 60 s  (AI calls)
//   everything else      → 60 per 60 s  (general API abuse)

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();
const WINDOW_MS = 60_000;

const LIMITS: Record<string, number> = {
  "/api/subscribe":       5,
  "/api/validate-coupon": 10,
  "/api/verify-payment":  10,
  "/api/analyze":         20,
};
const DEFAULT_LIMIT = 60;

function getLimit(pathname: string): number {
  for (const [route, limit] of Object.entries(LIMITS)) {
    if (pathname.startsWith(route)) return limit;
  }
  return DEFAULT_LIMIT;
}

function checkRateLimit(ip: string, pathname: string): boolean {
  const key   = `${ip}:${pathname}`;
  const limit = getLimit(pathname);
  const now   = Date.now();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true; // allowed
  }

  if (entry.count >= limit) return false; // blocked

  entry.count++;
  return true; // allowed
}

// Clean up expired entries periodically so the Map doesn't grow forever.
// This runs in the same Edge runtime instance — lightweight enough.
let lastCleanup = 0;
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60_000) return;
  lastCleanup = now;
  store.forEach((entry, key) => {
    if (now > entry.resetAt) store.delete(key);
  });
}

// ── Middleware ────────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) return NextResponse.next();

  // Skip the Flutterwave webhook — it's server-to-server and uses its own auth
  if (pathname.startsWith("/api/webhook/")) return NextResponse.next();

  // Get real IP (Vercel sets x-forwarded-for; fall back to a sentinel)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  maybeCleanup();

  if (!checkRateLimit(ip, pathname)) {
    return NextResponse.json(
      { error: "Too many requests — please slow down and try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(getLimit(pathname)),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
