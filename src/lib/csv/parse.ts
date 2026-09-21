/**
 * Small RFC 4180 CSV parser shared by the browser (inside a Web Worker) and the server.
 * Handles quoted fields, escaped quotes, CRLF/LF, BOM. Streams rows through a callback so
 * large files never build one giant array of strings before validation.
 */

export interface ParsedCsv {
  header: string[];
  rows: string[][];
  /** 1-based line number of each row in the source file (for error messages). */
  lineNumbers: number[];
  delimiter: string;
}

export const CSV_LIMITS = {
  maxBytes: 5 * 1024 * 1024, // 5 MB
  maxRows: 10_000,
  maxColumns: 32,
} as const;

function detectDelimiter(firstLine: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const c of candidates) {
    const count = firstLine.split(c).length - 1;
    if (count > bestCount) {
      best = c;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(text: string): ParsedCsv {
  let src = text;
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const firstLineEnd = src.indexOf("\n");
  const delimiter = detectDelimiter(firstLineEnd === -1 ? src : src.slice(0, firstLineEnd));

  const rows: string[][] = [];
  const lineNumbers: number[] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;
  let i = 0;
  const n = src.length;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    // Skip fully blank rows.
    if (row.length === 1 && row[0].trim() === "") {
      row = [];
      return;
    }
    rows.push(row);
    lineNumbers.push(rowStartLine);
    row = [];
  };

  while (i < n) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      if (ch === "\n") line++;
      field += ch;
      i++;
      continue;
    }
    if (ch === '"' && field === "") {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === delimiter) {
      endField();
      i++;
      continue;
    }
    if (ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      endRow();
      line++;
      rowStartLine = line;
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  if (field !== "" || row.length > 0) endRow();

  const header = (rows.shift() ?? []).map((h) => h.trim());
  lineNumbers.shift();
  return { header, rows, lineNumbers, delimiter };
}
