import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv/parse";
import { csvTemplate, validateCsvText } from "@/lib/csv/validate";

const opts = { assetSymbol: "USDC", assetDecimals: 6 };
const A1 = "0x1b3f9c2a8e4d6f7a9b0c1d2e3f4a5b6c7d8e9f0a";
const A2 = "0x9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e";

describe("parseCsv", () => {
  it("handles quotes, CRLF, BOM and blank lines", () => {
    const p = parseCsv('﻿name,address,amount\r\n"Smith, Jane",0xabc,"1,000.50"\r\n\r\nBob,0xdef,5\n');
    expect(p.header).toEqual(["name", "address", "amount"]);
    expect(p.rows).toEqual([
      ["Smith, Jane", "0xabc", "1,000.50"],
      ["Bob", "0xdef", "5"],
    ]);
    expect(p.lineNumbers).toEqual([2, 4]);
  });
  it("detects semicolon delimiters", () => {
    const p = parseCsv("name;address;amount\nA;0x1;2");
    expect(p.delimiter).toBe(";");
    expect(p.rows[0]).toEqual(["A", "0x1", "2"]);
  });
});

describe("validateCsvText", () => {
  it("accepts the template", () => {
    const s = validateCsvText(csvTemplate(), opts);
    expect(s.ok).toBe(true);
    expect(s.validCount).toBe(3);
    expect(s.totalAmount).toBe("4330500000");
  });
  it("reports missing columns", () => {
    const s = validateCsvText("name,amount\nA,1", opts);
    expect(s.ok).toBe(false);
    expect(s.fileErrors[0].code).toBe("COLUMNS_MISSING");
    expect(s.fileErrors[0].message).toMatch(/address/);
  });
  it("reports empty files", () => {
    expect(validateCsvText("", opts).fileErrors[0].code).toBe("FILE_EMPTY");
    expect(validateCsvText("name,address,amount\n", opts).fileErrors[0].code).toBe("NO_ROWS");
  });
  it("flags invalid addresses, amounts, duplicates and assets without dropping rows", () => {
    const csv = ["name,address,amount,asset", `A,${A1},10,USDC`, `B,0x123,10,USDC`, `C,${A2},abc,USDC`, `D,${A1},5,USDC`, `E,${A2},1,DOGE`, `,${A2},1,`].join("\n");
    const s = validateCsvText(csv, opts);
    expect(s.rows).toHaveLength(6);
    expect(s.validCount).toBe(1);
    expect(s.invalidCount).toBe(5);
    expect(s.rows[1].errors[0].code).toBe("ADDRESS_FORMAT");
    expect(s.rows[2].errors[0].code).toBe("AMOUNT_INVALID");
    expect(s.rows[3].errors[0].code).toBe("DUPLICATE_ADDRESS");
    expect(s.rows[4].errors.map((e) => e.code)).toContain("ASSET_UNSUPPORTED");
    expect(s.rows[5].errors.map((e) => e.code)).toContain("NAME_EMPTY");
    expect(s.totalAmount).toBe("10000000");
  });
  it("rejects checksum typos but accepts lowercase", () => {
    const bad = "0x1B3f9C2a8E4d6F7a9B0c1D2e3F4a5B6c7D8e9F0a"; // mixed case, wrong checksum
    const s = validateCsvText(`name,address,amount\nA,${bad},1\nB,${A1},1`, opts);
    expect(s.rows[0].errors[0].code).toBe("ADDRESS_CHECKSUM");
    expect(s.rows[1].valid).toBe(true);
  });
  it("maps header aliases", () => {
    const s = validateCsvText(`Contractor Name,Wallet Address,Payment Amount,Invoice\nA,${A1},1,INV-1`, opts);
    expect(s.validCount).toBe(1);
    expect(s.rows[0].reference).toBe("INV-1");
  });
  it("handles 10k rows quickly", () => {
    const rows = Array.from({ length: 10_000 }, (_, i) => `R${i},0x${(i + 1).toString(16).padStart(40, "0")},${i + 1}.5`);
    const t = Date.now();
    const s = validateCsvText("name,address,amount\n" + rows.join("\n"), opts);
    expect(s.validCount).toBe(10_000);
    expect(Date.now() - t).toBeLessThan(5000);
  });
  it("rejects more than the row limit", () => {
    const rows = Array.from({ length: 10_001 }, (_, i) => `R${i},${A1},1`);
    const s = validateCsvText("name,address,amount\n" + rows.join("\n"), opts);
    expect(s.fileErrors[0].code).toBe("TOO_MANY_ROWS");
  });
});
