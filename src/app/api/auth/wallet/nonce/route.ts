import { issueNonce } from "@/lib/auth/wallet";
import { fail, handler, json } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Step one of Sign-In with Ethereum: a single-use nonce, kept in an httpOnly cookie. */
export const GET = handler(async (req) => {
  const limit = rateLimit(`siwe:nonce:${clientIp(req)}`, { limit: 60, windowMs: 10 * 60_000 });
  if (!limit.ok) return fail(429, "Too many requests. Try again in a few minutes.", "RATE_LIMITED", { "retry-after": String(limit.retryAfterSec) });
  return json({ nonce: issueNonce() });
});
