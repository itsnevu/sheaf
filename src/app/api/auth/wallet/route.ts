import { z } from "zod";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { signInWithWallet, verifyWalletSignature } from "@/lib/auth/wallet";
import { fail, handler, json, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const Body = z.object({ message: z.string().min(20).max(4000), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) });

export const dynamic = "force-dynamic";

/** Step two: verify the signed message, then sign the wallet in (creating its workspace on first use). */
export const POST = handler(async (req) => {
  const limit = rateLimit(`siwe:verify:${clientIp(req)}`, { limit: 30, windowMs: 10 * 60_000 });
  if (!limit.ok) return fail(429, "Too many sign-in attempts. Try again in a few minutes.", "RATE_LIMITED", { "retry-after": String(limit.retryAfterSec) });
  const body = Body.parse(await readJson(req));
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const wallet = await verifyWalletSignature({ message: body.message, signature: body.signature, host });
  const target = await signInWithWallet(wallet.address);
  const token = await createSession(target.userId, target.organizationId);
  setSessionCookie(token);
  return json({ ok: true, address: wallet.address, created: target.created });
});
