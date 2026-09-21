/** Prize amounts are stored as integer base units (6 decimals) in strings. Never floats. */

export const DECIMALS = 6;

export function toUnits(decimal: string): string {
  const [w, f = ""] = decimal.trim().split(".");
  if (!/^\d+$/.test(w) || !/^\d*$/.test(f) || f.length > DECIMALS) throw new Error("Invalid amount");
  return (BigInt(w) * 10n ** BigInt(DECIMALS) + BigInt(f.padEnd(DECIMALS, "0") || "0")).toString();
}

export function formatUnits(units: string | bigint, minFraction = 0, maxFraction = 2): string {
  const u = BigInt(units);
  const neg = u < 0n;
  const abs = neg ? -u : u;
  const whole = abs / 10n ** BigInt(DECIMALS);
  const frac = (abs % 10n ** BigInt(DECIMALS)).toString().padStart(DECIMALS, "0").slice(0, maxFraction).replace(/0+$/, "");
  const fracOut = frac.length < minFraction ? frac.padEnd(minFraction, "0") : frac;
  const wholeOut = whole.toLocaleString("en-US");
  return `${neg ? "-" : ""}${wholeOut}${fracOut ? "." + fracOut : ""}`;
}

export function houseFee(units: string, percent: number): { fee: string; net: string } {
  const u = BigInt(units);
  const fee = (u * BigInt(percent)) / 100n;
  return { fee: fee.toString(), net: (u - fee).toString() };
}
