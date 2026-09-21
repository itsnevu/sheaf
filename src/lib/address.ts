import { getAddress, isAddress } from "viem";

export type AddressCheck =
  | { ok: true; address: `0x${string}`; warning?: string }
  | { ok: false; code: string; message: string };

/**
 * EVM address validation. Accepts lowercase / uppercase (no checksum information) and
 * rejects mixed-case strings whose checksum does not match (likely a typo).
 */
export function checkEvmAddress(input: string): AddressCheck {
  const raw = input.trim();
  if (!raw) return { ok: false, code: "ADDRESS_EMPTY", message: "Wallet address is empty" };
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) {
    if (/^[0-9a-fA-F]{40}$/.test(raw)) {
      return { ok: false, code: "ADDRESS_NO_PREFIX", message: "Address is missing the 0x prefix" };
    }
    if (raw.includes(".")) {
      return { ok: false, code: "ADDRESS_ENS", message: "Names are not supported; use the 0x address" };
    }
    return {
      ok: false,
      code: "ADDRESS_FORMAT",
      message: `"${raw.length > 24 ? raw.slice(0, 24) + "…" : raw}" is not a 42-character hex address`,
    };
  }
  const hasUpper = /[A-F]/.test(raw.slice(2));
  const hasLower = /[a-f]/.test(raw.slice(2));
  if (hasUpper && hasLower && !isAddress(raw, { strict: true })) {
    return { ok: false, code: "ADDRESS_CHECKSUM", message: "Mixed-case address fails its checksum (possible typo)" };
  }
  const address = getAddress(raw);
  if (/^0x0{40}$/.test(address)) {
    return { ok: false, code: "ADDRESS_ZERO", message: "The zero address cannot receive funds" };
  }
  if (/^0x(dead|DEAD)/i.test(address) && /dead$/i.test(address)) {
    return { ok: true, address, warning: "Address looks like a burn address" };
  }
  return { ok: true, address };
}

export function shortAddress(a: string | null | undefined, head = 6, tail = 4): string {
  if (!a) return "—";
  if (a.length <= head + tail + 2) return a;
  return `${a.slice(0, head)}…${a.slice(-tail)}`;
}

/** Redaction for Viewer role: keep the prefix only. */
export function redactAddress(a: string | null | undefined): string | null {
  if (!a) return null;
  return a.slice(0, 6) + "…" + "•".repeat(4);
}
