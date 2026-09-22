/**
 * Everything the printer can print. SERIES picks a topic, WORK picks a page in it. Every line
 * is Sheaf's own copy; the printer only decides how it looks.
 */
export type Line =
  | { kind: "h1"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "p"; text: string }
  | { kind: "kv"; k: string; v: string }
  | { kind: "row"; cols: string[]; head?: boolean }
  | { kind: "rule"; style?: "solid" | "dots" }
  | { kind: "gap"; rows?: number }
  | { kind: "img"; src: string; alt: string }
  | { kind: "cta"; text: string; href: string }
  | { kind: "small"; text: string };

export interface Work {
  code: string;
  title: string;
  lines: Line[];
  href?: string;
}

export interface Series {
  letter: string;
  name: string;
  works: Work[];
}

const stamp = (code: string, title: string): Line[] => [
  { kind: "row", cols: ["SHEAF", code, "BATCH PAYMENTS"] },
  { kind: "rule" },
  { kind: "h1", text: title },
];

export const SERIES: Series[] = [
  {
    letter: "A",
    name: "SHEAF",
    works: [
      {
        code: "A-01",
        title: "Don't re-key thirty transfers. Control one batch.",
        lines: [
          ...stamp("A-01", "DON'T RE-KEY THIRTY TRANSFERS."),
          { kind: "h1", text: "CONTROL ONE BATCH." },
          { kind: "gap" },
          { kind: "p", text: "Sheaf is batch payments for finance teams that pay people. One CSV in, every payout validated, routed, approved, executed and reconciled, on its own row, with its own receipt." },
          { kind: "gap" },
          { kind: "kv", k: "ASSETS", v: "USDC · USDT · ETH" },
          { kind: "kv", k: "RAILS", v: "EVM chains via Relay" },
          { kind: "kv", k: "MODE", v: "Demo workspace, no keys needed" },
          { kind: "rule", style: "dots" },
          { kind: "img", src: "/art/print/sheaf.png", alt: "A bound sheaf of payment slips" },
          { kind: "rule", style: "dots" },
          { kind: "cta", text: "OPEN THE DEMO WORKSPACE →", href: "/sign-in" },
          { kind: "small", text: "Turn SERIES to B for how it works. Turn WORK for the next page." },
        ],
        href: "/sign-in",
      },
      {
        code: "A-02",
        title: "Who it is for",
        lines: [
          ...stamp("A-02", "WHO IT IS FOR"),
          { kind: "p", text: "Finance and ops teams paying contractors, creators, grant recipients and vendors in stablecoins, thirty to three thousand at a time." },
          { kind: "gap" },
          { kind: "row", cols: ["TEAM", "PAYS", "CADENCE"], head: true },
          { kind: "row", cols: ["Studio ops", "contractors", "bi-weekly"] },
          { kind: "row", cols: ["DAO treasury", "grants", "per round"] },
          { kind: "row", cols: ["Marketplace", "creators", "daily"] },
          { kind: "row", cols: ["Agency", "vendors", "monthly"] },
          { kind: "rule" },
          { kind: "small", text: "Private externally, transparent internally." },
        ],
      },
      {
        code: "A-03",
        title: "Principles",
        lines: [
          ...stamp("A-03", "PRINCIPLES"),
          { kind: "kv", k: "01", v: "Every payout on its own. One row, one transfer, one receipt." },
          { kind: "kv", k: "02", v: "Nothing moves without a second pair of eyes." },
          { kind: "kv", k: "03", v: "A failed row never blocks the rest of the batch." },
          { kind: "kv", k: "04", v: "Secrets stay encrypted at rest; the audit log is append-only." },
          { kind: "kv", k: "05", v: "The export you send to accounting is the same data we executed." },
        ],
      },
    ],
  },
  {
    letter: "B",
    name: "HOW IT WORKS",
    works: [
      { code: "B-01", title: "Upload", lines: [...stamp("B-01", "1 · UPLOAD"), { kind: "p", text: "One header, five columns: recipient, address, asset, amount, memo. Paste it or drop the CSV. Sheaf keeps the file exactly as you sent it." }, { kind: "rule", style: "dots" }, { kind: "row", cols: ["recipient", "address", "asset", "amount", "memo"], head: true }, { kind: "row", cols: ["Ana R.", "0x8f3…c21e", "USDC", "1,250.00", "Sep retainer"] }, { kind: "row", cols: ["Studio K", "0x91d…4b7a", "USDT", "480.00", "Inv 2231"] }, { kind: "row", cols: ["M. Okafor", "0x2c8…9f03", "ETH", "0.35", "Bounty #12"] }] },
      { code: "B-02", title: "Validate", lines: [...stamp("B-02", "2 · VALIDATE"), { kind: "p", text: "Every row is checked before anything is signed: checksum addresses, supported assets, amount precision, duplicates, and a balance check against the treasury." }, { kind: "kv", k: "PASS", v: "28 rows" }, { kind: "kv", k: "WARN", v: "1 row · memo missing" }, { kind: "kv", k: "FAIL", v: "1 row · bad checksum" }, { kind: "small", text: "Failed rows are held back; the rest of the batch continues." }] },
      { code: "B-03", title: "Route", lines: [...stamp("B-03", "3 · ROUTE"), { kind: "p", text: "Each row gets a route: which chain, which asset contract, which bridge if the recipient lives elsewhere. Routes are quoted through Relay and shown before approval." }, { kind: "row", cols: ["ROW", "FROM", "TO", "FEE"], head: true }, { kind: "row", cols: ["01", "Base USDC", "Base", "$0.02"] }, { kind: "row", cols: ["02", "Base USDT", "Arbitrum", "$0.41"] }, { kind: "row", cols: ["03", "Base ETH", "Base", "$0.03"] }] },
      { code: "B-04", title: "Approve", lines: [...stamp("B-04", "4 · APPROVE"), { kind: "p", text: "The preparer cannot approve their own batch. The approver sees totals per asset, the full row list and every warning, then signs off once." }, { kind: "kv", k: "PREPARED BY", v: "ops@" }, { kind: "kv", k: "APPROVED BY", v: "cfo@" }, { kind: "kv", k: "TOTAL", v: "31,204.35 USDC · 0.35 ETH" }] },
      { code: "B-05", title: "Execute", lines: [...stamp("B-05", "5 · EXECUTE"), { kind: "p", text: "A worker executes row by row with retries and idempotency keys, so a flaky RPC never double-pays. Each transfer gets its hash the moment it confirms." }, { kind: "row", cols: ["ROW", "STATUS", "HASH"], head: true }, { kind: "row", cols: ["01", "confirmed", "0x4e1…77aa"] }, { kind: "row", cols: ["02", "confirmed", "0xd2c…08be"] }, { kind: "row", cols: ["03", "retrying", "—"] }] },
      { code: "B-06", title: "Reconcile", lines: [...stamp("B-06", "6 · RECONCILE"), { kind: "p", text: "Confirmed transfers are matched back to the rows, exported as CSV for accounting, and the batch closes with an append-only audit trail." }, { kind: "kv", k: "MATCHED", v: "29 / 29" }, { kind: "kv", k: "EXPORT", v: "batch-2026-09-14.csv" }, { kind: "cta", text: "READ THE DOCS →", href: "/docs" }], href: "/docs" },
    ],
  },
  {
    letter: "C",
    name: "UNDER THE HOOD",
    works: [
      { code: "C-01", title: "Encryption", lines: [...stamp("C-01", "ENCRYPTION AT REST"), { kind: "p", text: "Recipient addresses, memos and API secrets are encrypted field by field with AES-256-GCM before they reach the database. The key never leaves the server environment." }] },
      { code: "C-02", title: "Audit log", lines: [...stamp("C-02", "APPEND-ONLY AUDIT"), { kind: "p", text: "Every state change is an audit event. Database triggers refuse updates and deletes on the audit table, so history cannot be rewritten, not even by an admin." }] },
      { code: "C-03", title: "Roles", lines: [...stamp("C-03", "FOUR-EYES BY DEFAULT"), { kind: "kv", k: "PREPARER", v: "uploads, validates, routes" }, { kind: "kv", k: "APPROVER", v: "signs off, cannot prepare" }, { kind: "kv", k: "VIEWER", v: "reads everything, changes nothing" }] },
      { code: "C-04", title: "Rate limits", lines: [...stamp("C-04", "RATE LIMITS AND RETRIES"), { kind: "p", text: "Per-workspace rate limits on every mutating endpoint. Execution retries with backoff and idempotency keys, so the same row can never be paid twice." }] },
      { code: "C-05", title: "Stack", lines: [...stamp("C-05", "THE STACK"), { kind: "row", cols: ["Next.js 14", "TypeScript", "Prisma"], head: true }, { kind: "row", cols: ["viem", "Relay", "Postgres/SQLite"] }, { kind: "small", text: "Docker image, Caddy in front, health checks on /api/health." }] },
    ],
  },
  {
    letter: "D",
    name: "A BATCH",
    works: [
      { code: "D-01", title: "Sample batch", lines: [...stamp("D-01", "BATCH #0142 · SEPTEMBER PAYOUTS"), { kind: "kv", k: "ROWS", v: "31" }, { kind: "kv", k: "ASSETS", v: "USDC 29 · USDT 1 · ETH 1" }, { kind: "kv", k: "STATE", v: "executing · 27 confirmed" }, { kind: "rule", style: "dots" }, { kind: "row", cols: ["#", "RECIPIENT", "AMOUNT", "STATE"], head: true }, { kind: "row", cols: ["01", "Ana R.", "1,250.00 USDC", "confirmed"] }, { kind: "row", cols: ["02", "Studio K", "480.00 USDT", "confirmed"] }, { kind: "row", cols: ["03", "M. Okafor", "0.35 ETH", "confirmed"] }, { kind: "row", cols: ["04", "Devi P.", "2,100.00 USDC", "retrying"] }, { kind: "row", cols: ["05", "Nord GmbH", "3,300.00 USDC", "queued"] }, { kind: "row", cols: ["…", "26 more", "", ""] }, { kind: "rule" }, { kind: "kv", k: "TOTAL", v: "31,204.35 USDC" }] },
      { code: "D-02", title: "Receipt", lines: [...stamp("D-02", "RECEIPT · ROW 01"), { kind: "kv", k: "TO", v: "Ana R. · 0x8f3…c21e" }, { kind: "kv", k: "AMOUNT", v: "1,250.00 USDC" }, { kind: "kv", k: "ROUTE", v: "Base → Base" }, { kind: "kv", k: "HASH", v: "0x4e19…77aa" }, { kind: "kv", k: "CONFIRMED", v: "2026-09-14 09:31:02Z" }, { kind: "kv", k: "APPROVED BY", v: "cfo@" }, { kind: "rule", style: "dots" }, { kind: "small", text: "Every row prints one of these. Accounting gets the CSV." }] },
      { code: "D-03", title: "Audit trail", lines: [...stamp("D-03", "AUDIT TRAIL · #0142"), { kind: "row", cols: ["09:02", "ops@", "batch created"] }, { kind: "row", cols: ["09:04", "system", "31 rows validated"] }, { kind: "row", cols: ["09:06", "ops@", "routes quoted"] }, { kind: "row", cols: ["09:20", "cfo@", "approved"] }, { kind: "row", cols: ["09:31", "worker", "row 01 confirmed"] }, { kind: "row", cols: ["…", "", ""] }, { kind: "small", text: "Append-only. Nothing here can be edited or removed." }] },
    ],
  },
  {
    letter: "E",
    name: "SECURITY",
    works: [
      { code: "E-01", title: "Security", lines: [...stamp("E-01", "SECURITY"), { kind: "p", text: "Sheaf never holds your private keys in the app. Execution uses a dedicated signer with a spend limit; the UI only prepares and approves." }, { kind: "kv", k: "SESSIONS", v: "httpOnly, sameSite, rotated" }, { kind: "kv", k: "HEADERS", v: "CSP, HSTS, no sniff, no frames" }, { kind: "kv", k: "ERRORS", v: "generic in production" }, { kind: "cta", text: "SECURITY PAGE →", href: "/security" }], href: "/security" },
      { code: "E-02", title: "Privacy", lines: [...stamp("E-02", "PRIVACY"), { kind: "p", text: "Recipient data is yours. It is encrypted, it is not shared, and it is deleted when you delete it, except the audit trail, which keeps ids, not names." }, { kind: "cta", text: "PRIVACY PAGE →", href: "/privacy" }], href: "/privacy" },
    ],
  },
  {
    letter: "F",
    name: "DOCS",
    works: [
      { code: "F-01", title: "Docs", lines: [...stamp("F-01", "DOCUMENTATION"), { kind: "kv", k: "CSV FORMAT", v: "one header, five columns" }, { kind: "kv", k: "API", v: "/api/batches · /api/payments · /api/export" }, { kind: "kv", k: "WORKER", v: "/api/worker, cron or Docker" }, { kind: "kv", k: "DEPLOY", v: "docker compose up" }, { kind: "cta", text: "OPEN THE DOCS →", href: "/docs" }], href: "/docs" },
    ],
  },
  {
    letter: "G",
    name: "START",
    works: [
      { code: "G-01", title: "Start", lines: [...stamp("G-01", "START"), { kind: "p", text: "The demo workspace runs in simulation mode: real validation, real routing quotes, no funds moved. Switch to real mode with your own signer when you are ready." }, { kind: "cta", text: "OPEN THE DEMO WORKSPACE →", href: "/sign-in" }, { kind: "small", text: "Right-click the print to copy or save it." }], href: "/sign-in" },
    ],
  },
];

export const WORK_NUMBERS = ["01", "02", "03", "04", "05", "06", "07", "08", "09"];

export function findWork(seriesIndex: number, workIndex: number): { series: Series; work: Work | null } {
  const series = SERIES[((seriesIndex % SERIES.length) + SERIES.length) % SERIES.length]!;
  return { series, work: series.works[workIndex] ?? null };
}

export function missingWork(series: Series, workNumber: string): Work {
  return {
    code: `${series.letter}-${workNumber}`,
    title: "Nothing here",
    lines: [{ kind: "row", cols: ["SHEAF", `${series.letter}-${workNumber}`, "NO WORK"] }, { kind: "rule" }, { kind: "p", text: `Series ${series.letter} (${series.name}) has ${series.works.length} page${series.works.length === 1 ? "" : "s"}. Turn WORK back to 01–${String(series.works.length).padStart(2, "0")}.` }],
  };
}

export function workToText(work: Work): string {
  return work.lines
    .map((l) => {
      switch (l.kind) {
        case "h1":
        case "h2":
        case "p":
        case "small":
          return l.text;
        case "kv":
          return `${l.k}: ${l.v}`;
        case "row":
          return l.cols.join("  ");
        case "rule":
          return "----------------";
        case "cta":
          return `${l.text} ${l.href}`;
        case "img":
          return `[${l.alt}]`;
        default:
          return "";
      }
    })
    .join("\n");
}
