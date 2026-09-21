/**
 * Small in-memory sliding-window rate limiter for authentication endpoints. Per process:
 * enough to blunt credential stuffing on a single instance. Multi-instance deployments should
 * also rate limit at the edge (reverse proxy or WAF). Set SHEAF_RATE_LIMIT=off for test runs.
 */

type Bucket = number[]; // timestamps of recent hits

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, opts: { limit: number; windowMs: number }, now = Date.now()): RateLimitResult {
  if (process.env.SHEAF_RATE_LIMIT === "off") return { ok: true, remaining: opts.limit, retryAfterSec: 0 };
  sweep(now);
  const since = now - opts.windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > since);
  if (hits.length >= opts.limit) {
    buckets.set(key, hits);
    return { ok: false, remaining: 0, retryAfterSec: Math.max(1, Math.ceil((hits[0] + opts.windowMs - now) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, remaining: opts.limit - hits.length, retryAfterSec: 0 };
}

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, hits] of buckets) {
    if (!hits.length || hits[hits.length - 1] < now - 3_600_000) buckets.delete(k);
  }
}

/** Test hook. */
export function resetRateLimits() {
  buckets.clear();
}

/** Client address for limiting. Trusts the first x-forwarded-for hop, as set by the reverse proxy. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}
