import { z } from "zod";
import { isAddress } from "viem";
import { issueNonce } from "@/lib/auth";
import { assertRate, clientIp, handler, ok, readJson } from "@/lib/http";

const NonceInput = z.object({
  wallet: z.string().refine((v) => isAddress(v), "wallet must be a 0x address"),
});

/**
 * POST /api/auth/nonce — step one of wallet sign-in.
 * Body: { wallet }. Returns the one-time nonce and the exact plain-text message the wallet must sign.
 */
export const POST = handler(async (req) => {
  assertRate(`auth:nonce:${clientIp(req)}`, 20, 10 * 60_000);
  const { wallet } = NonceInput.parse(await readJson(req));
  const { nonce, issuedAt, message } = await issueNonce(wallet);
  return ok({ nonce, issuedAt, message });
});
