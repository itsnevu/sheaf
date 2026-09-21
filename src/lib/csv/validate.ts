import { checkEvmAddress } from "@/lib/address";
import { MoneyError, parseAmount } from "@/lib/money";
import { CSV_LIMITS, parseCsv } from "./parse";

export interface RowIssue {
  code: string;
  message: string;
  field?: "name" | "address" | "amount" | "asset" | "reference" | "row";
}

export interface ValidatedRow {
  rowNumber: number; // 1-based data row (excluding header)
  line: number; // source line number
  name: string;
  addressInput: string;
  address: string | null;
  amountInput: string;
  amount: string | null; // base units
  assetSymbol: string;
  reference: string | null;
  valid: boolean;
  errors: RowIssue[];
  warnings: RowIssue[];
}

export interface ValidationSummary {
  ok: boolean;
  fileErrors: RowIssue[];
  header: string[];
  columns: Record<RequiredColumn | OptionalColumn, number | null>;
  rows: ValidatedRow[];
  validCount: number;
  invalidCount: number;
  totalAmount: string; // base units, valid rows only
  duplicateAddresses: number;
}

export type RequiredColumn = "name" | "address" | "amount";
export type OptionalColumn = "asset" | "reference";

export interface ValidationOptions {
  assetSymbol: string;
  assetDecimals: number;
  /** Other symbols accepted in the asset column (case-insensitive). */
  acceptedAssets?: string[];
  maxRows?: number;
  /** Amount above which a warning is emitted (base units). */
  largeAmountWarn?: bigint;
}

const HEADER_ALIASES: Record<RequiredColumn | OptionalColumn, string[]> = {
  name: ["name", "contractor", "contractor name", "recipient", "recipient name", "payee", "full name", "employee"],
  address: ["address", "wallet", "wallet address", "recipient address", "wallet_address", "to", "destination", "evm address"],
  amount: ["amount", "payment", "payment amount", "value", "total", "pay", "usd", "usdc"],
  asset: ["asset", "currency", "token", "symbol", "coin"],
  reference: ["reference", "ref", "internal reference", "memo", "note", "invoice", "invoice id", "id"],
};

function normHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/^﻿/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function mapColumns(header: string[]): Record<RequiredColumn | OptionalColumn, number | null> {
  const normalized = header.map(normHeader);
  const out: Record<RequiredColumn | OptionalColumn, number | null> = {
    name: null,
    address: null,
    amount: null,
    asset: null,
    reference: null,
  };
  for (const key of Object.keys(HEADER_ALIASES) as Array<RequiredColumn | OptionalColumn>) {
    const aliases = HEADER_ALIASES[key];
    let idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx === -1) idx = normalized.findIndex((h) => aliases.some((a) => h.includes(a)));
    if (idx !== -1 && !Object.values(out).includes(idx)) out[key] = idx;
  }
  return out;
}

export function validateCsvText(text: string, opts: ValidationOptions): ValidationSummary {
  const fileErrors: RowIssue[] = [];
  if (!text || text.trim() === "") {
    return emptySummary([{ code: "FILE_EMPTY", message: "The file is empty" }]);
  }
  const parsed = parseCsv(text);
  const columns = mapColumns(parsed.header);
  const missing = (["name", "address", "amount"] as RequiredColumn[]).filter((c) => columns[c] === null);
  if (parsed.header.length === 0) {
    fileErrors.push({ code: "HEADER_MISSING", message: "The first line must be a header row" });
  } else if (missing.length) {
    fileErrors.push({
      code: "COLUMNS_MISSING",
      message: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Found: ${parsed.header.join(", ") || "none"}`,
    });
  }
  if (parsed.header.length > CSV_LIMITS.maxColumns) {
    fileErrors.push({ code: "TOO_MANY_COLUMNS", message: `More than ${CSV_LIMITS.maxColumns} columns` });
  }
  if (parsed.rows.length === 0 && fileErrors.length === 0) {
    fileErrors.push({ code: "NO_ROWS", message: "The file has a header but no recipient rows" });
  }
  const maxRows = opts.maxRows ?? CSV_LIMITS.maxRows;
  if (parsed.rows.length > maxRows) {
    fileErrors.push({ code: "TOO_MANY_ROWS", message: `The file has ${parsed.rows.length} rows; the limit is ${maxRows}` });
  }
  if (fileErrors.length) return { ...emptySummary(fileErrors), header: parsed.header, columns };

  const accepted = new Set([opts.assetSymbol, ...(opts.acceptedAssets ?? [])].map((s) => s.toUpperCase()));
  const seen = new Map<string, number>();
  const rows: ValidatedRow[] = [];
  let total = 0n;
  let duplicates = 0;

  parsed.rows.forEach((cells, i) => {
    const get = (c: RequiredColumn | OptionalColumn) => {
      const idx = columns[c];
      return idx === null ? "" : (cells[idx] ?? "").trim();
    };
    const errors: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    const name = get("name");
    const addressInput = get("address");
    const amountInput = get("amount");
    const assetInput = get("asset");
    const reference = get("reference") || null;

    if (cells.length > parsed.header.length) {
      errors.push({ code: "ROW_EXTRA_CELLS", message: `Row has ${cells.length} cells but the header has ${parsed.header.length}`, field: "row" });
    }
    if (!name) errors.push({ code: "NAME_EMPTY", message: "Contractor name is empty", field: "name" });
    else if (name.length > 120) errors.push({ code: "NAME_TOO_LONG", message: "Name is longer than 120 characters", field: "name" });

    let address: string | null = null;
    const ac = checkEvmAddress(addressInput);
    if (ac.ok) {
      address = ac.address;
      if (ac.warning) warnings.push({ code: "ADDRESS_WARNING", message: ac.warning, field: "address" });
    } else {
      errors.push({ code: ac.code, message: ac.message, field: "address" });
    }

    let amount: string | null = null;
    try {
      const units = parseAmount(amountInput, opts.assetDecimals);
      amount = units.toString();
      if (opts.largeAmountWarn && units >= opts.largeAmountWarn) {
        warnings.push({ code: "AMOUNT_LARGE", message: "Amount is unusually large; double-check before approving", field: "amount" });
      }
    } catch (e) {
      const me = e as MoneyError;
      errors.push({ code: me.code ?? "AMOUNT_INVALID", message: me.message, field: "amount" });
    }

    let assetSymbol = opts.assetSymbol;
    if (assetInput) {
      const up = assetInput.toUpperCase();
      if (!accepted.has(up)) {
        errors.push({ code: "ASSET_UNSUPPORTED", message: `Asset "${assetInput}" is not supported for this batch (expected ${opts.assetSymbol})`, field: "asset" });
      } else {
        assetSymbol = up;
      }
    }

    if (address) {
      const key = address.toLowerCase();
      const first = seen.get(key);
      if (first !== undefined) {
        duplicates++;
        errors.push({ code: "DUPLICATE_ADDRESS", message: `Same wallet as row ${first}. Merge or remove one of them`, field: "address" });
      } else {
        seen.set(key, i + 1);
      }
    }

    const valid = errors.length === 0;
    if (valid && amount) total += BigInt(amount);
    rows.push({
      rowNumber: i + 1,
      line: parsed.lineNumbers[i] ?? i + 2,
      name,
      addressInput,
      address,
      amountInput,
      amount,
      assetSymbol,
      reference,
      valid,
      errors,
      warnings,
    });
  });

  const validCount = rows.filter((r) => r.valid).length;
  return {
    ok: validCount > 0 && validCount === rows.length,
    fileErrors: [],
    header: parsed.header,
    columns,
    rows,
    validCount,
    invalidCount: rows.length - validCount,
    totalAmount: total.toString(),
    duplicateAddresses: duplicates,
  };
}

function emptySummary(fileErrors: RowIssue[]): ValidationSummary {
  return {
    ok: false,
    fileErrors,
    header: [],
    columns: { name: null, address: null, amount: null, asset: null, reference: null },
    rows: [],
    validCount: 0,
    invalidCount: 0,
    totalAmount: "0",
    duplicateAddresses: 0,
  };
}

/** The downloadable template. Kept here so the API route and the docs share one source. */
export function csvTemplate(assetSymbol = "USDC"): string {
  return [
    "name,address,amount,asset,reference",
    `Ada Okafor,0x1b3f9c2a8e4d6f7a9b0c1d2e3f4a5b6c7d8e9f0a,1250.00,${assetSymbol},INV-2026-0912`,
    `Mateo Ruiz,0x9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e,980.50,${assetSymbol},INV-2026-0913`,
    `Priya Natarajan,0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d,2100.00,${assetSymbol},`,
  ].join("\n");
}
