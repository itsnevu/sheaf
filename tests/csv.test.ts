import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse";
import { LEG_CSV_HEADER, csvTemplate, parseNotBefore, validateCsvText } from "@/lib/csv/validate";

const opts = { assetSymbol: "USDG", assetDecimals: 6 };
const A1 = "0x1b3f9c2a8e4d6f7a9b0c1d2e3f4a5b6c7d8e9f0a";
const A2 = "0x9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e";
const H = LEG_CSV_HEADER; // label,address,asset,amount,not_before,memo

describe("parseCsv", () => {
  it("handles quotes, CRLF, BOM and blank lines", () => {
    const p = parseCsv('﻿label,address,amount\r\n"Smith, Jane",0xabc,"1,000.50"\r\n\r\nBob,0xdef,5\n');
    expect(p.header).toEqual(["label", "address", "amount"]);
    expect(p.rows).toEqual([
      ["Smith, Jane", "0xabc", "1,000.50"],
      ["Bob", "0xdef", "5"],
    ]);
    expect(p.lineNumbers).toEqual([2, 4]);
  });
  it("detects semicolon delimiters", () => {
    const p = parseCsv("label;address;amount\nA;0x1;2");
    expect(p.delimiter).toBe(";");
    expect(p.rows[0]).toEqual(["A", "0x1", "2"]);
  });
});

describe("validateCsvText", () => {
  it("uses the leg header", () => {
    expect(H).toBe("label,address,asset,amount,not_before,memo");
    expect(csvTemplate().split("\n")[0]).toBe(H);
  });
  it("accepts the template", () => {
    const s = validateCsvText(csvTemplate(), opts);
    expect(s.ok).toBe(true);
    expect(s.validCount).toBe(3);
    expect(s.totalAmount).toBe("4330500000");
    expect(s.rows[0].notBefore).toBe("2026-10-01T09:00:00.000Z");
    expect(s.rows[0].reference).toBe("fresh recipient A");
    expect(s.rows[2].notBefore).toBeNull();
    expect(s.rows[2].reference).toBeNull();
  });
  it("defaults the asset to the operation's settlement asset", () => {
    const s = validateCsvText(`label,address,amount\nA,${A1},1`, opts);
    expect(s.validCount).toBe(1);
    expect(s.rows[0].assetSymbol).toBe("USDG");
  });
  it("reports missing columns", () => {
    const s = validateCsvText("label,amount\nA,1", opts);
    expect(s.ok).toBe(false);
    expect(s.fileErrors[0].code).toBe("COLUMNS_MISSING");
    expect(s.fileErrors[0].message).toMatch(/address/);
    expect(s.fileErrors[0].message).toContain(H);
  });
  it("reports empty files", () => {
    expect(validateCsvText("", opts).fileErrors[0].code).toBe("FILE_EMPTY");
    expect(validateCsvText(`${H}\n`, opts).fileErrors[0].code).toBe("NO_ROWS");
  });
  it("flags invalid addresses, amounts, duplicates, assets and labels without dropping rows", () => {
    const csv = [H, `A,${A1},USDG,10,,`, `B,0x123,USDG,10,,`, `C,${A2},USDG,abc,,`, `D,${A1},USDG,5,,`, `E,${A2},DOGE,1,,`, `,${A2},,1,,`].join("\n");
    const s = validateCsvText(csv, opts);
    expect(s.rows).toHaveLength(6);
    expect(s.validCount).toBe(1);
    expect(s.invalidCount).toBe(5);
    expect(s.rows[1].errors[0].code).toBe("ADDRESS_FORMAT");
    expect(s.rows[2].errors[0].code).toBe("AMOUNT_INVALID");
    expect(s.rows[3].errors[0].code).toBe("DUPLICATE_ADDRESS");
    expect(s.rows[4].errors.map((e) => e.code)).toContain("ASSET_UNSUPPORTED");
    expect(s.rows[5].errors.map((e) => e.code)).toContain("LABEL_EMPTY");
    expect(s.totalAmount).toBe("10000000");
  });
  it("validates not_before as ISO 8601 and keeps it optional", () => {
    const csv = [H, `A,${A1},,1,2026-10-01T09:00:00Z,`, `B,${A2},,1,next tuesday,`, `C,0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d,,1,2026-10-02,`].join("\n");
    const s = validateCsvText(csv, opts);
    expect(s.rows[0].valid).toBe(true);
    expect(s.rows[0].notBefore).toBe("2026-10-01T09:00:00.000Z");
    expect(s.rows[1].valid).toBe(false);
    expect(s.rows[1].errors[0].code).toBe("NOT_BEFORE_INVALID");
    expect(s.rows[2].notBefore).toBe("2026-10-02T00:00:00.000Z");
    expect(parseNotBefore("")).toBeNull();
    expect(parseNotBefore("2026-13-45")).toBeNull();
  });
  it("rejects checksum typos but accepts lowercase", () => {
    const bad = "0x1B3f9C2a8E4d6F7a9B0c1D2e3F4a5B6c7D8e9F0a"; // mixed case, wrong checksum
    const s = validateCsvText(`label,address,amount\nA,${bad},1\nB,${A1},1`, opts);
    expect(s.rows[0].errors[0].code).toBe("ADDRESS_CHECKSUM");
    expect(s.rows[1].valid).toBe(true);
  });
  it("maps header aliases", () => {
    const s = validateCsvText(`Counterparty,Wallet Address,Token,Amount,Not Before,Note\nA,${A1},USDG,1,2026-10-01T09:00:00Z,OTC-1`, opts);
    expect(s.validCount).toBe(1);
    expect(s.rows[0].name).toBe("A");
    expect(s.rows[0].reference).toBe("OTC-1");
    expect(s.rows[0].notBefore).toBe("2026-10-01T09:00:00.000Z");
  });
  it("handles 10k legs quickly", () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => `R${i},0x${(i + 1).toString(16).padStart(40, "0")},${i + 1}.5`);
    const t = Date.now();
    const s = validateCsvText("label,address,amount\n" + rows.join("\n"), opts);
    expect(s.validCount).toBe(10_000);
    expect(Date.now() - t).toBeLessThan(5000);
  });
  it("rejects more than the row limit", () => {
    const rows = Array.from({ length: 10_001 }, (_, i) => `R${i},${A1},1`);
    const s = validateCsvText("label,address,amount\n" + rows.join("\n"), opts);
    expect(s.fileErrors[0].code).toBe("TOO_MANY_ROWS");
  });
});
