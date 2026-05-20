import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ── Distributed rate limiter (Upstash Redis) ─────────────────────────────────
// Why distributed: Vercel runs each function invocation in a serverless
// instance (different regions / cold starts have different memory), so an
// in-memory Map can't enforce a real cross-region limit. Upstash Redis is a
// global key-value store every instance can read and increment atomically.
//
// Limits per route (requests / 60-second sliding window):
//   /api/subscribe       → 5    (payment initiation — abuse + cost)
//   /api/validate-coupon → 10   (coupon brute-force prevention)
//   /api/verify-payment  → 10   (payment verification)
//   /api/analyze         → 20   (AI calls — expensive)
//   /api/chat/support    → 15   (AI streaming — expensive + unauth)
//   /api/chat/escalate   → 3    (rare action; cap spam)
//   /api/chat/review     → 5    (rare action; cap spam)
//   /api/pdf/upload      → 10   (file processing)
//   /api/client-errors   → 30   (error reporting — generous so we don't lose data)
//   everything else      → 60   (general API abuse floor)

const HAS_UPSTASH =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = HAS_UPSTASH ? Redis.fromEnv() : null;

// One Ratelimit instance per route. Different prefixes keep counters separate.
function makeLimit(tokens: number, prefix: string): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, "60 s"),
    analytics: false,
    prefix: `pl:${prefix}`,
  });
}

const LIMITS: Record<string, { limit: Ratelimit | null; max: number }> = {
  "/api/subscribe":       { limit: makeLimit(5,  "subscribe"), max: 5  },
  "/api/validate-coupon": { limit: makeLimit(10, "coupon"),    max: 10 },
  "/api/verify-payment":  { limit: makeLimit(10, "verify"),    max: 10 },
  "/api/analyze":         { limit: makeLimit(20, "analyze"),   max: 20 },
  "/api/chat/support":    { limit: makeLimit(15, "chat-supp"), max: 15 },
  "/api/chat/escalate":   { limit: makeLimit(3,  "chat-esc"),  max: 3  },
  "/api/chat/review":     { limit: makeLimit(5,  "chat-rev"),  max: 5  },
  "/api/pdf/upload":      { limit: makeLimit(10, "pdf-up"),    max: 10 },
  "/api/client-errors":   { limit: makeLimit(30, "cli-err"),   max: 30 },
};
const DEFAULT_LIMIT_REQS = 60;
const defaultLimit = makeLimit(DEFAULT_LIMIT_REQS, "default");

function pickLimit(pathname: string): { limit: Ratelimit | null; max: number } {
  for (const [route, cfg] of Object.entries(LIMITS)) {
    if (pathname.startsWith(route)) return cfg;
  }
  return { limit: defaultLimit, max: DEFAULT_LIMIT_REQS };
}

// ── Local-dev fallback (in-memory) ──────────────────────────────────────────
// Only used when Upstash env vars aren't set — e.g. during `npm run dev`.
// Keeps the dev experience smooth without forcing devs to configure Redis.
const memStore = new Map<string, { count: number; resetAt: number }>();
function memCheck(ip: string, pathname: string, limit: number): boolean {
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

// ── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/")) return NextResponse.next();
  // Webhook is server-to-server with its own auth — don't rate-limit
  if (pathname.startsWith("/api/webhook/")) return NextResponse.next();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const { limit, max } = pickLimit(pathname);

  let allowed = true;
  let remaining = max;
  let reset = Date.now() + 60_000;

  if (limit) {
    try {
      const result = await limit.limit(`${ip}:${pathname}`);
      allowed = result.success;
      remaining = result.remaining;
      reset = result.reset;
    } catch (err) {
      // Redis hiccup — fail open to avoid bricking the API on infra issues
      console.error("[ratelimit] Upstash error, allowing request:", err);
      allowed = true;
    }
  } else {
    // No Upstash configured — use in-memory fallback (dev / first deploy)
    allowed = memCheck(ip, pathname, max);
  }

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests — please slow down and try again in a minute." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": String(max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(reset / 1000)),
        },
      }
    );
  }

  const res = NextResponse.next();
  res.headers.set("X-RateLimit-Limit", String(max));
  res.headers.set("X-RateLimit-Remaining", String(remaining));
  res.headers.set("X-RateLimit-Reset", String(Math.floor(reset / 1000)));
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
