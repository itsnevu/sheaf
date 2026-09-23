import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Field-level encryption for personal data at rest (leg labels, memos and
 * the original CSV). AES-256-GCM with a random 96-bit nonce per value. Ciphertext is stored as
 * `enc1:<base64url(nonce || tag || ciphertext)>`, so plaintext written before encryption was
 * enabled still reads back unchanged (see scripts/encrypt-existing.ts to convert it).
 *
 * Key: SHEAF_ENCRYPTION_KEY, 64 hex characters (32 bytes). Required in production; in other
 * environments a key is derived from SESSION_SECRET so local setups work without extra config.
 */

const PREFIX = "enc1:";
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

let cachedKey: Buffer | undefined;
let warned = false;

export function encryptionKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.SHEAF_ENCRYPTION_KEY?.trim();
  if (raw) {
    if (!/^[0-9a-fA-F]{64}$/.test(raw)) throw new Error("SHEAF_ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
    cachedKey = Buffer.from(raw, "hex");
    return cachedKey;
  }
  if (process.env.NODE_ENV === "production") throw new Error("SHEAF_ENCRYPTION_KEY is required in production");
  if (!warned) {
    warned = true;
    console.warn("[crypto] SHEAF_ENCRYPTION_KEY not set; deriving a development key from SESSION_SECRET");
  }
  cachedKey = scryptSync(process.env.SESSION_SECRET || "sheaf-dev", "sheaf-field-encryption", 32);
  return cachedKey;
}

/** Test hook: forget the cached key so a changed environment is picked up. */
export function resetEncryptionKey() {
  cachedKey = undefined;
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptString<T extends string | null | undefined>(value: T): T {
  if (typeof value !== "string" || isEncrypted(value)) return value;
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), nonce);
  const ct = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (PREFIX + Buffer.concat([nonce, tag, ct]).toString("base64url")) as T;
}

export function decryptString<T extends string | null | undefined>(value: T): T {
  if (!isEncrypted(value)) return value;
  const buf = Buffer.from(value.slice(PREFIX.length), "base64url");
  if (buf.length < NONCE_BYTES + TAG_BYTES) throw new Error("Corrupt encrypted field");
  const nonce = buf.subarray(0, NONCE_BYTES);
  const tag = buf.subarray(NONCE_BYTES, NONCE_BYTES + TAG_BYTES);
  const ct = buf.subarray(NONCE_BYTES + TAG_BYTES);
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8") as T;
  } catch {
    throw new Error("Cannot decrypt field: SHEAF_ENCRYPTION_KEY does not match the key that wrote it");
  }
}

/** Constant-time comparison for secrets carried in headers. */
export function secretsEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
