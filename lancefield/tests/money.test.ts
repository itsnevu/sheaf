import { describe, expect, it } from "vitest";
import { formatUnits, houseFee, toUnits } from "@/lib/money";
import { fmtDate, shortWallet, timeLeft } from "@/lib/format";

describe("money", () => {
  it("converts decimals to base units exactly", () => {
    expect(toUnits("250")).toBe("250000000");
    expect(toUnits("12.5")).toBe("12500000");
    expect(toUnits("0.000001")).toBe("1");
    expect(() => toUnits("1.2345678")).toThrow();
    expect(() => toUnits("abc")).toThrow();
  });
  it("formats base units for display", () => {
    expect(formatUnits("250000000")).toBe("250");
    expect(formatUnits("12500000")).toBe("12.5");
    expect(formatUnits("1234567000000")).toBe("1,234,567");
    expect(formatUnits("100", 2)).toBe("0.00");
  });
  it("takes the house fee from the prize", () => {
    const { fee, net } = houseFee(toUnits("250"), 15);
    expect(formatUnits(fee)).toBe("37.5");
    expect(formatUnits(net)).toBe("212.5");
  });
});

describe("format", () => {
  it("shortens wallets", () => {
    expect(shortWallet("0x1111111111111111111111111111111111111111")).toBe("0x1111…1111");
    expect(shortWallet(null)).toBe("—");
  });
  it("describes time left", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    expect(timeLeft(new Date("2026-09-24T12:00:00Z"), now).label).toBe("3 days left");
    expect(timeLeft(new Date("2026-09-21T15:00:00Z"), now).label).toBe("3 hours left");
    expect(timeLeft(new Date("2026-09-20T12:00:00Z"), now)).toMatchObject({ over: true, label: "closed 1 day ago" });
  });
  it("formats dates", () => {
    expect(fmtDate(new Date("2026-09-21T12:00:00Z"))).toContain("2026");
  });
});
