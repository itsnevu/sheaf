import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import { verifySolanaMessage } from "@/lib/auth/solana";
import { solanaSignInMessage } from "@/lib/auth/wallet-message";

function fixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const bytes = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  let value = BigInt(`0x${bytes.toString("hex")}`), address = "";
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  while (value) { address = alphabet[Number(value % BigInt(58))] + address; value /= BigInt(58); }
  for (const byte of bytes) { if (byte !== 0) break; address = "1" + address; }
  const message = solanaSignInMessage({ address, host: "raqio.test", uri: "https://raqio.test", nonce: "testNonce123", issuedAt: new Date(Date.now() - 1000).toISOString(), expirationTime: new Date(Date.now() + 240_000).toISOString() });
  return { address, message, signature: `0x${sign(null, Buffer.from(message), privateKey).toString("hex")}`, host: "raqio.test", nonce: "testNonce123" };
}

describe("Solana wallet authentication", () => {
  it("verifies an Ed25519 signature and preserves the case-sensitive address", () => {
    const input = fixture();
    expect(verifySolanaMessage(input).address).toBe(input.address);
  });
  it("rejects another domain, nonce, modified message, expired message and malformed signature", () => {
    const input = fixture();
    expect(() => verifySolanaMessage({ ...input, host: "evil.test" })).toThrow();
    expect(() => verifySolanaMessage({ ...input, nonce: "other" })).toThrow();
    expect(() => verifySolanaMessage({ ...input, message: input.message.replace("No transaction", "A transaction") })).toThrow();
    expect(() => verifySolanaMessage({ ...input, message: JSON.stringify({ ...JSON.parse(input.message), expirationTime: new Date(0).toISOString() }) })).toThrow();
    expect(() => verifySolanaMessage({ ...input, signature: "0x1234" })).toThrow();
  });
});
