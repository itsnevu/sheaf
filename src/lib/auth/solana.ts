import { createPublicKey, verify } from "node:crypto";
import { HttpError } from "@/lib/http";

export function verifySolanaMessage(input: { message: string; signature: string; host: string; nonce: string }) {
  try {
    const data = JSON.parse(input.message);
    const now = Date.now(), issued = Date.parse(data.issuedAt), expires = Date.parse(data.expirationTime);
    if (data.app !== "Raqio" || data.family !== "solana" || data.domain !== input.host || new URL(data.uri).host !== input.host || !["http:", "https:"].includes(new URL(data.uri).protocol) || data.nonce !== input.nonce || !Number.isFinite(issued) || !Number.isFinite(expires) || issued > now || expires <= now || expires <= issued || expires - issued > 300_000 || now - issued > 300_000 || !["Sign in to Raqio. No transaction, no fees.", "Link this wallet to your Raqio account."].includes(data.statement)) throw new Error();
    if (typeof data.address !== "string" || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(data.address) || !/^0x[0-9a-fA-F]{128}$/.test(input.signature)) throw new Error();
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let number = BigInt(0);
    for (const char of data.address) number = number * BigInt(58) + BigInt(alphabet.indexOf(char));
    const bytes: number[] = [];
    while (number > BigInt(0)) { bytes.unshift(Number(number % BigInt(256))); number /= BigInt(256); }
    for (const char of data.address) { if (char !== "1") break; bytes.unshift(0); }
    if (bytes.length !== 32) throw new Error();
    const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), Buffer.from(bytes)]), format: "der", type: "spki" });
    if (!verify(null, Buffer.from(input.message), key, Buffer.from(input.signature.slice(2), "hex"))) throw new Error();
    return { address: data.address as string, chainId: 0 };
  } catch { throw new HttpError(401, "Solana sign-in rejected: invalid message, signature, domain, nonce or expiry", "BAD_SIGNATURE"); }
}
