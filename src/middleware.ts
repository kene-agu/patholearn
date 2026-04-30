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

const LIMITS: Record<string, Ratelimit | null> = {
  "/api/subscribe":       makeLimit(5,  "subscribe"),
  "/api/validate-coupon": makeLimit(10, "coupon"),
  "/api/verify-payment":  makeLimit(10, "verify"),
  "/api/analyze":         makeLimit(20, "analyze"),
};
const DEFAULT_LIMIT_REQS = 60;
const defaultLimit = makeLimit(DEFAULT_LIMIT_REQS, "default");

function pickLimit(pathname: string): { limit: Ratelimit | null; max: number } {
  for (const [route, limit] of Object.entries(LIMITS)) {
    if (pathname.startsWith(route)) {
      const max =
        route === "/api/subscribe" ? 5 :
        route === "/api/validate-coupon" || route === "/api/verify-payment" ? 10 :
        route === "/api/analyze" ? 20 : DEFAULT_LIMIT_REQS;
      return { limit, max };
    }
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
