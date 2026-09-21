import { describe, expect, it } from "vitest";
import { formatUnits, parseAmount, sumUnits, sumUsd } from "@/lib/money";

describe("parseAmount", () => {
  it("parses decimals exactly", () => {
    expect(parseAmount("1250.00", 6)).toBe(1_250_000_000n);
    expect(parseAmount("0.1", 6)).toBe(100_000n);
    expect(parseAmount("1,000,000.5", 6)).toBe(1_000_000_500_000n);
    expect(parseAmount("0.000001", 6)).toBe(1n);
  });
  it("rejects bad input", () => {
    expect(() => parseAmount("", 6)).toThrow(/empty/);
    expect(() => parseAmount("-5", 6)).toThrow(/positive/);
    expect(() => parseAmount("abc", 6)).toThrow(/not a valid number/);
    expect(() => parseAmount("1.2345678", 6)).toThrow(/decimal places/);
    expect(() => parseAmount("0", 6)).toThrow(/greater than zero/);
    expect(() => parseAmount("1e5", 6)).toThrow();
  });
  it("never loses precision on classic float traps", () => {
    const a = parseAmount("0.1", 6);
    const b = parseAmount("0.2", 6);
    expect(formatUnits(a + b, 6)).toBe("0.30");
    expect(sumUnits(["100000", "200000", null])).toBe(300_000n);
  });
});

describe("formatUnits", () => {
  it("groups thousands and trims zeros", () => {
    expect(formatUnits(1_250_000_000n, 6)).toBe("1,250.00");
    expect(formatUnits("1", 6)).toBe("0.000001");
    expect(formatUnits(0n, 6)).toBe("0.00");
    expect(formatUnits(123456789012345678n, 18, 4)).toBe("0.123456789012345678");
  });
  it("sums usd strings exactly", () => {
    expect(sumUsd(["0.120343", "0.047085", null])).toBe("0.167428");
  });
});
