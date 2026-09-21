import { z } from "zod";
import { getAddress, isAddress } from "viem";
import { setSessionCookie, verifySignIn } from "@/lib/auth";
import { assertRate, clientIp, handler, HttpError, ok, readJson } from "@/lib/http";

const VerifyInput = z.object({
  wallet: z.string().refine((v) => isAddress(v), "wallet must be a 0x address"),
  nonce: z.string().min(1).max(128),
  issuedAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "issuedAt must be an ISO 8601 date"),
  signature: z.string().regex(/^0x[0-9a-fA-F]+$/, "signature must be a 0x hex string"),
});

/**
 * POST /api/auth/verify — step two of wallet sign-in.
 * Body: { wallet, nonce, issuedAt, signature }. Verifies the signature against the message issued
 * for that nonce, then sets the session cookie. A failed check is 401 with the reason.
 */
export const POST = handler(async (req) => {
  assertRate(`auth:verify:${clientIp(req)}`, 20, 10 * 60_000);
  const input = VerifyInput.parse(await readJson(req));
  let session: { sponsorId: string; token: string };
  try {
    session = await verifySignIn({ wallet: input.wallet, nonce: input.nonce, issuedAt: input.issuedAt, signature: input.signature as `0x${string}` });
  } catch (e) {
    throw new HttpError(401, "unauthorized", e instanceof Error ? e.message : "Sign-in failed");
  }
  setSessionCookie(session.token);
  return ok({ wallet: getAddress(input.wallet) });
});
