import { z } from "zod";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { linkWallet, unlinkWallet, verifyWalletSignature } from "@/lib/auth/wallet";
import { fail, handler, json, readJson } from "@/lib/http";

const Body = z.object({ message: z.string().min(20).max(4000), signature: z.string().regex(/^0x[0-9a-fA-F]+$/) });

export const dynamic = "force-dynamic";

/** The wallet linked to the signed-in account. */
export const GET = handler(async () => {
  const session = await getSession();
  if (!session) return fail(401, "Sign in first", "UNAUTHENTICATED");
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { walletAddress: true } });
  return json({ walletAddress: user?.walletAddress ?? null });
});

/** Link a wallet to the signed-in account after a SIWE signature. */
export const POST = handler(async (req) => {
  const session = await getSession();
  if (!session) return fail(401, "Sign in first", "UNAUTHENTICATED");
  const body = Body.parse(await readJson(req));
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const wallet = await verifyWalletSignature({ message: body.message, signature: body.signature, host });
  await linkWallet(session.userId, session.organizationId, session.email, wallet.address);
  return json({ ok: true, walletAddress: wallet.address });
});

export const DELETE = handler(async () => {
  const session = await getSession();
  if (!session) return fail(401, "Sign in first", "UNAUTHENTICATED");
  await unlinkWallet(session.userId, session.organizationId, session.email);
  return json({ ok: true, walletAddress: null });
});
