/**
 * Simple in-memory fixed-window rate limiter.
 *
 * LIMITATION: this state lives in the Node.js process's memory. On a
 * single long-running server (a VPS, a Docker container, `next start`) it
 * works correctly. On serverless platforms with multiple concurrent
 * instances (e.g. Vercel under load), each instance has its own counter, so
 * the effective limit is `limit * number_of_instances` rather than a hard
 * global cap. That's an acceptable trade-off for a free-tier MVP; the
 * documented upgrade path is a shared store like Upstash Redis (free tier
 * available) — swap the internals of `hit()` for a Redis INCR + EXPIRE and
 * every call site here stays the same.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function hit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    const resetAt = now + windowSeconds * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

/** Extracts a best-effort client IP from standard proxy headers. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
