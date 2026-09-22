import { describe, expect, it } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage, generateSiweNonce } from "viem/siwe";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { linkWallet, signInWithWallet, verifyWalletSignature } from "@/lib/auth/wallet";
import { makeOrg } from "./helpers";

const KEY = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const account = privateKeyToAccount(KEY);

async function signed(nonce: string, overrides: Partial<Parameters<typeof createSiweMessage>[0]> = {}) {
  const message = createSiweMessage({ address: account.address, chainId: 8453, domain: "sheaf.test", uri: "https://sheaf.test", nonce, version: "1", statement: "Sign in to Sheaf.", ...overrides });
  const signature = await account.signMessage({ message });
  return { message, signature };
}

describe("sign-in with ethereum", () => {
  it("accepts a valid signature for the right domain and nonce", async () => {
    const nonce = generateSiweNonce();
    const { message, signature } = await signed(nonce);
    const w = await verifyWalletSignature({ message, signature, host: "sheaf.test", nonce });
    expect(w.address).toBe(account.address.toLowerCase());
    expect(w.chainId).toBe(8453);
  });

  it("rejects a wrong nonce, a wrong domain and a tampered signature", async () => {
    const nonce = generateSiweNonce();
    const { message, signature } = await signed(nonce);
    await expect(verifyWalletSignature({ message, signature, host: "sheaf.test", nonce: generateSiweNonce() })).rejects.toBeInstanceOf(HttpError);
    await expect(verifyWalletSignature({ message, signature, host: "evil.test", nonce })).rejects.toBeInstanceOf(HttpError);
    const bad = (signature.slice(0, 20) + (signature[20] === "a" ? "b" : "a") + signature.slice(21)) as `0x${string}`;
    await expect(verifyWalletSignature({ message, signature: bad, host: "sheaf.test", nonce })).rejects.toBeInstanceOf(HttpError);
    await expect(verifyWalletSignature({ message, signature, host: "sheaf.test", nonce: null })).rejects.toMatchObject({ code: "NONCE_MISSING" });
  });

  it("creates a workspace on first sign-in and reuses it afterwards", async () => {
    const address = account.address.toLowerCase();
    const first = await signInWithWallet(address);
    expect(first.created).toBe(true);
    const user = await db.user.findUniqueOrThrow({ where: { walletAddress: address }, include: { memberships: true } });
    expect(user.memberships[0]?.role).toBe("OWNER");
    expect(user.memberships[0]?.organizationId).toBe(first.organizationId);
    const second = await signInWithWallet(address);
    expect(second.created).toBe(false);
    expect(second.userId).toBe(first.userId);
    const events = await db.auditEvent.findMany({ where: { organizationId: first.organizationId, action: "organization.created" } });
    expect(events).toHaveLength(1);
  });

  it("links a wallet to an existing account and refuses a second owner", async () => {
    const ctx = await makeOrg();
    const other = privateKeyToAccount("0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba").address.toLowerCase();
    await linkWallet(ctx.finance.userId, ctx.finance.organizationId, ctx.finance.email, other);
    const u = await db.user.findUniqueOrThrow({ where: { id: ctx.finance.userId } });
    expect(u.walletAddress).toBe(other);
    const ctx2 = await makeOrg();
    await expect(linkWallet(ctx2.finance.userId, ctx2.finance.organizationId, ctx2.finance.email, other)).rejects.toMatchObject({ status: 409 });
  });
});
