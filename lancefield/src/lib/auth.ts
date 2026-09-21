import "server-only";
import { createHash, randomBytes } from "crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { getAddress, verifyMessage } from "viem";
import { db } from "./db";
import { SITE } from "./config";

/**
 * Sponsor sign-in with a wallet: the browser asks for a nonce, signs a plain-text message with
 * personal_sign, and the server verifies the signature with viem before issuing a session cookie.
 * No private key or seed phrase ever reaches the server; the signature proves control of the address.
 */

export const SESSION_COOKIE = "lf_session";
const SESSION_DAYS = 30;
const NONCE_MINUTES = 10;

function hash(v: string): string {
  return createHash("sha256")
    .update(v + (process.env.SESSION_SECRET ?? ""))
    .digest("hex");
}

export function signInMessage(wallet: string, nonce: string, issuedAt: string): string {
  return [`${SITE.name} wants you to sign in with your wallet.`, "", `Address: ${wallet}`, `Nonce: ${nonce}`, `Issued at: ${issuedAt}`, "", "This signature only proves you control this address. It costs nothing and moves no funds."].join("\n");
}

export async function issueNonce(wallet: string): Promise<{ nonce: string; issuedAt: string; message: string }> {
  const address = getAddress(wallet);
  const nonce = randomBytes(16).toString("hex");
  const issuedAt = new Date().toISOString();
  // Housekeeping: drop used and expired nonces so the table never grows without bound.
  await db.nonce.deleteMany({ where: { OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }] } });
  await db.nonce.create({ data: { value: nonce, wallet: address, expiresAt: new Date(Date.now() + NONCE_MINUTES * 60_000) } });
  return { nonce, issuedAt, message: signInMessage(address, nonce, issuedAt) };
}

export async function verifySignIn(input: { wallet: string; nonce: string; issuedAt: string; signature: `0x${string}` }): Promise<{ sponsorId: string; token: string }> {
  const address = getAddress(input.wallet);
  // Consume the nonce atomically first, so one signed message can never mint two sessions.
  const consumed = await db.nonce.updateMany({ where: { value: input.nonce, wallet: address, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  if (consumed.count !== 1) throw new Error("Nonce is invalid or expired; start the sign-in again");
  const valid = await verifyMessage({ address, message: signInMessage(address, input.nonce, input.issuedAt), signature: input.signature });
  if (!valid) throw new Error("Signature does not match the address");
  const sponsor = await db.sponsor.upsert({ where: { wallet: address }, update: {}, create: { wallet: address } });
  const token = randomBytes(32).toString("base64url");
  await db.session.create({ data: { sponsorId: sponsor.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) } });
  return { sponsorId: sponsor.id, token };
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86_400 });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function destroySession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
}

export interface SponsorSession {
  sponsorId: string;
  wallet: string;
  name: string | null;
}

/** Cached per request, so the layout and the page share one session lookup. */
export const getSponsor = cache(async (): Promise<SponsorSession | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({ where: { tokenHash: hash(token) }, include: { sponsor: true } });
  if (!s || s.expiresAt < new Date()) return null;
  return { sponsorId: s.sponsorId, wallet: s.sponsor.wallet, name: s.sponsor.name };
});
