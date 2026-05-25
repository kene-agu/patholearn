import { Redis } from "@upstash/redis";

// Server-side authoritative cap on free (unauthenticated) slide analyses per IP
// per day. Mirrors GUEST_FREE_ANALYSES in src/lib/guestSession.ts — keep in sync.
// The middleware's 20/min per-IP rate limit is the abuse backstop; this is the
// "taste before sign-up" budget that protects AI token cost.
export const GUEST_DAILY_ANALYSES = 3;

const HAS_UPSTASH =
  !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = HAS_UPSTASH ? Redis.fromEnv() : null;

function guestKey(ip: string): string {
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  return `pl:guest-analyze:${ip}:${day}`;
}

// Check (without incrementing) whether this IP can run another free analysis.
// Fails open when Redis is unavailable so infra hiccups don't block guests —
// the per-minute rate limit still bounds abuse in that window.
export async function checkGuestQuota(
  ip: string
): Promise<{ allowed: boolean; used: number; limit: number }> {
  if (!redis) return { allowed: true, used: 0, limit: GUEST_DAILY_ANALYSES };
  try {
    const used = (await redis.get<number>(guestKey(ip))) ?? 0;
    return { allowed: used < GUEST_DAILY_ANALYSES, used, limit: GUEST_DAILY_ANALYSES };
  } catch (err) {
    console.error("[guestQuota] Redis check failed, allowing:", err);
    return { allowed: true, used: 0, limit: GUEST_DAILY_ANALYSES };
  }
}

// Count a successful free analysis against the IP's daily budget. Called only
// after the analysis succeeds so failed attempts don't burn the quota.
export async function recordGuestUsage(ip: string): Promise<void> {
  if (!redis) return;
  try {
    const key = guestKey(ip);
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, 60 * 60 * 25); // ~25h covers the UTC day
  } catch (err) {
    console.error("[guestQuota] Redis record failed:", err);
  }
}
