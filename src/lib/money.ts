/**
 * Exact money handling. Amounts are integer base units held in bigint / decimal strings.
 * No floating point anywhere in this module.
 */

export class MoneyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "MoneyError";
  }
}

const DECIMAL_RE = /^(\d+)(?:\.(\d+))?$/;

/** Parse a human decimal string ("1,250.50", "0.1") into base units for `decimals`. */
export function parseAmount(input: string, decimals: number): bigint {
  const cleaned = input.trim().replace(/,/g, "").replace(/^\+/, "");
  if (cleaned === "") throw new MoneyError("Amount is empty", "AMOUNT_EMPTY");
  if (cleaned.startsWith("-")) throw new MoneyError("Amount must be positive", "AMOUNT_NEGATIVE");
  const m = DECIMAL_RE.exec(cleaned);
  if (!m) throw new MoneyError(`"${input.trim()}" is not a valid number`, "AMOUNT_INVALID");
  const whole = m[1];
  const frac = m[2] ?? "";
  if (frac.length > decimals) {
    throw new MoneyError(
      `Amount has ${frac.length} decimal places; the asset supports at most ${decimals}`,
      "AMOUNT_TOO_PRECISE",
    );
  }
  const units = BigInt(whole + frac.padEnd(decimals, "0"));
  if (units === 0n) throw new MoneyError("Amount must be greater than zero", "AMOUNT_ZERO");
  return units;
}

/** Format base units to a plain decimal string without trailing zeros (keeps at least 2 dp). */
export function formatUnits(units: bigint | string, decimals: number, minFraction = 2): string {
  const v = typeof units === "string" ? BigInt(units) : units;
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const s = abs.toString().padStart(decimals + 1, "0");
  const whole = s.slice(0, s.length - decimals);
  let frac = decimals > 0 ? s.slice(s.length - decimals) : "";
  frac = frac.replace(/0+$/, "");
  if (frac.length < minFraction) frac = frac.padEnd(minFraction, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + grouped + (frac ? "." + frac : "");
}

export function sumUnits(values: Array<bigint | string | null | undefined>): bigint {
  let total = 0n;
  for (const v of values) {
    if (v === null || v === undefined) continue;
    total += typeof v === "string" ? BigInt(v) : v;
  }
  return total;
}

/** Sum of decimal USD strings ("0.12", "1.5") with 6 dp precision, returned as a decimal string. */
export function sumUsd(values: Array<string | null | undefined>): string {
  let total = 0n;
  for (const v of values) {
    if (!v) continue;
    total += parseAmount(v.startsWith("-") ? v.slice(1) : v || "0", 6) * (v.startsWith("-") ? -1n : 1n);
  }
  return formatUnits(total, 6, 2);
}

export function toDisplayUsd(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return "$" + formatUnits(parseAmount(value, 6), 6, 2);
  } catch {
    return "—";
  }
}
