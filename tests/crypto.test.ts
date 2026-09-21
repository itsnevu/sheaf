import { afterEach, describe, expect, it } from "vitest";
import { decryptString, encryptString, isEncrypted, resetEncryptionKey, secretsEqual } from "@/lib/crypto";

const KEY_A = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const KEY_B = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

afterEach(() => {
  process.env.SHEAF_ENCRYPTION_KEY = KEY_A;
  resetEncryptionKey();
});

describe("field encryption", () => {
  it("round-trips text and never stores the plaintext", () => {
    const ct = encryptString("Ada Okafor");
    expect(isEncrypted(ct)).toBe(true);
    expect(ct).not.toContain("Ada");
    expect(decryptString(ct)).toBe("Ada Okafor");
  });
  it("uses a fresh nonce per value", () => {
    expect(encryptString("same")).not.toBe(encryptString("same"));
  });
  it("passes null, undefined and legacy plaintext through", () => {
    expect(encryptString(null)).toBeNull();
    expect(encryptString(undefined)).toBeUndefined();
    expect(decryptString("plain value")).toBe("plain value");
    expect(decryptString(null)).toBeNull();
  });
  it("does not double-encrypt", () => {
    const once = encryptString("x");
    expect(encryptString(once)).toBe(once);
  });
  it("fails loudly with the wrong key", () => {
    const ct = encryptString("secret");
    process.env.SHEAF_ENCRYPTION_KEY = KEY_B;
    resetEncryptionKey();
    expect(() => decryptString(ct)).toThrow(/does not match/);
  });
  it("rejects malformed keys", () => {
    process.env.SHEAF_ENCRYPTION_KEY = "short";
    resetEncryptionKey();
    expect(() => encryptString("x")).toThrow(/64 hex/);
  });
  it("handles unicode and long values", () => {
    const long = "Zoë Ñandú 🚀 ".repeat(2000);
    expect(decryptString(encryptString(long))).toBe(long);
  });
});

describe("secretsEqual", () => {
  it("compares in constant time and rejects empties", () => {
    expect(secretsEqual("abc", "abc")).toBe(true);
    expect(secretsEqual("abc", "abd")).toBe(false);
    expect(secretsEqual("abc", "abcd")).toBe(false);
    expect(secretsEqual(null, "abc")).toBe(false);
    expect(secretsEqual("", "")).toBe(false);
  });
});
