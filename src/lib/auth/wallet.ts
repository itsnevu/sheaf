import "server-only";
import { cookies } from "next/headers";
import { verifyMessage, type Hex } from "viem";
import { generateSiweNonce, parseSiweMessage, validateSiweMessage } from "viem/siwe";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { HttpError } from "@/lib/http";
import { hashPassword } from "@/lib/auth/session";

/**
 * Sign-In with Ethereum (EIP-4361). The server hands out a nonce in an httpOnly cookie, the
 * browser signs a SIWE message with that nonce, and the server checks domain, nonce, time and
 * signature before it looks the wallet up. Wallet accounts are ordinary users: the address is
 * the credential, a placeholder email keeps the schema simple, and the first sign-in creates a
 * workspace owned by the wallet.
 */
export const NONCE_COOKIE = "sheaf_siwe_nonce";
const NONCE_TTL_SEC = 300;

export function issueNonce(): string {
  const nonce = generateSiweNonce();
  cookies().set(NONCE_COOKIE, nonce, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: NONCE_TTL_SEC });
  return nonce;
}

function readNonce(): string | null {
  const v = cookies().get(NONCE_COOKIE)?.value ?? null;
  cookies().delete(NONCE_COOKIE);
  return v;
}

export interface VerifiedWallet {
  address: string;
  chainId: number;
}

/** Verifies a signed SIWE message against the nonce cookie and the request host. Throws HttpError. */
export async function verifyWalletSignature(input: { message: string; signature: string; host: string; nonce?: string | null }): Promise<VerifiedWallet> {
  const nonce = input.nonce === undefined ? readNonce() : input.nonce;
  if (!nonce) throw new HttpError(400, "Sign-in nonce expired. Try again.", "NONCE_MISSING");
  const parsed = parseSiweMessage(input.message);
  if (!parsed.address || !parsed.nonce) throw new HttpError(400, "Malformed sign-in message", "BAD_MESSAGE");
  const host = input.host.replace(/^https?:\/\//, "");
  const ok = validateSiweMessage({ message: parsed, domain: host, nonce, time: new Date() });
  if (!ok) throw new HttpError(401, "Sign-in message rejected: wrong domain, nonce or time window", "BAD_MESSAGE");
  let valid = false;
  try {
    valid = await verifyMessage({ address: parsed.address, message: input.message, signature: input.signature as Hex });
  } catch {
    valid = false; // malformed signature bytes are just a failed signature, not a server error
  }
  if (!valid) throw new HttpError(401, "Signature does not match the wallet", "BAD_SIGNATURE");
  return { address: parsed.address.toLowerCase(), chainId: parsed.chainId ?? 1 };
}

export function shortWallet(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Finds the user behind a wallet, or creates a workspace owned by it. Returns the session target. */
export async function signInWithWallet(address: string): Promise<{ userId: string; organizationId: string; created: boolean }> {
  const existing = await db.user.findUnique({ where: { walletAddress: address }, include: { memberships: true } });
  if (existing) {
    const m = existing.memberships[0];
    if (!m) throw new HttpError(403, "This wallet belongs to no organization");
    return { userId: existing.id, organizationId: m.organizationId, created: false };
  }
  const short = shortWallet(address);
  let slug = `wallet-${address.slice(2, 10)}`;
  if (await db.organization.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const org = await db.organization.create({ data: { name: `Workspace ${short}`, slug } });
  // Wallet accounts have no password; a random hash keeps the column non-null and unguessable.
  const user = await db.user.create({ data: { name: `Wallet ${short}`, email: `${address}@wallet.sheaf.invalid`, passwordHash: hashPassword(generateSiweNonce() + generateSiweNonce()), walletAddress: address } });
  await db.membership.create({ data: { userId: user.id, organizationId: org.id, role: "OWNER" } });
  await audit({ organizationId: org.id, actorId: user.id, actorEmail: user.email, action: "organization.created", summary: `Workspace “${org.name}” created by wallet ${short}` });
  return { userId: user.id, organizationId: org.id, created: true };
}

/** Links a verified wallet to an existing account. One wallet, one account. */
export async function linkWallet(userId: string, organizationId: string, actorEmail: string, address: string): Promise<void> {
  const taken = await db.user.findUnique({ where: { walletAddress: address } });
  if (taken && taken.id !== userId) throw new HttpError(409, "This wallet is already linked to another account", "WALLET_TAKEN");
  await db.user.update({ where: { id: userId }, data: { walletAddress: address } });
  await audit({ organizationId, actorId: userId, actorEmail, action: "user.wallet_linked", summary: `Wallet ${shortWallet(address)} linked` });
}

export async function unlinkWallet(userId: string, organizationId: string, actorEmail: string): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { walletAddress: null } });
  await audit({ organizationId, actorId: userId, actorEmail, action: "user.wallet_unlinked", summary: "Wallet unlinked" });
}
