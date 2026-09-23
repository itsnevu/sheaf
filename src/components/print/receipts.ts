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
  { kind: "row", cols: ["SHEAF", code, "EXECUTION DESK"] },
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
        title: "The private execution desk for Robinhood Chain.",
        lines: [
          ...stamp("A-01", "THE PRIVATE EXECUTION DESK"),
          { kind: "h1", text: "FOR ROBINHOOD CHAIN." },
          { kind: "gap" },
          { kind: "p", text: "A sheaf is one controlled operation made of legs, executed from one desk. Claim an allocation, accumulate a position, settle an OTC block or run a treasury without the owning wallet appearing as the destination on-chain." },
          { kind: "gap" },
          { kind: "kv", k: "CHAIN", v: "Robinhood Chain · id 4663" },
          { kind: "kv", k: "SETTLEMENT", v: "USDG" },
          { kind: "kv", k: "MODE", v: "Demo desk, no keys needed" },
          { kind: "rule", style: "dots" },
          { kind: "img", src: "/art/print/sheaf.png", alt: "A bound sheaf of operation legs" },
          { kind: "rule", style: "dots" },
          { kind: "cta", text: "OPEN THE DEMO DESK →", href: "/sign-in" },
          { kind: "small", text: "Private externally. Transparent internally. Turn SERIES to B for the four operations." },
        ],
        href: "/sign-in",
      },
      {
        code: "A-02",
        title: "Who it is for",
        lines: [
          ...stamp("A-02", "WHO IT IS FOR"),
          { kind: "p", text: "Teams that move size on Robinhood Chain and do not want the wallet that owns the funds, or the eligibility, to be the address everyone watches." },
          { kind: "gap" },
          { kind: "row", cols: ["DESK", "RUNS", "OPERATION"], head: true },
          { kind: "row", cols: ["Launch team", "allocations", "CLAIM"] },
          { kind: "row", cols: ["Fund", "a position", "ACCUMULATE"] },
          { kind: "row", cols: ["Family office", "a block trade", "OTC"] },
          { kind: "row", cols: ["Market maker", "daily spend", "TREASURY"] },
          { kind: "rule" },
          { kind: "small", text: "Amounts, timing and the desk contract stay public. The owner's wallet is not the destination." },
        ],
      },
      {
        code: "A-03",
        title: "Principles",
        lines: [
          ...stamp("A-03", "PRINCIPLES"),
          { kind: "kv", k: "01", v: "One sheaf, many legs. Each leg is a transfer with its own receipt." },
          { kind: "kv", k: "02", v: "Nothing executes without a second pair of eyes. The preparer cannot approve." },
          { kind: "kv", k: "03", v: "State what stays visible. Amounts, timing and the desk contract are public." },
          { kind: "kv", k: "04", v: "Never say anonymous. Correlation is possible; the copy says so." },
          { kind: "kv", k: "05", v: "The audit trail is append-only. The export is the data that executed." },
        ],
      },
    ],
  },
  {
    letter: "B",
    name: "THE FOUR OPERATIONS",
    works: [
      {
        code: "B-01",
        title: "Claim",
        lines: [
          ...stamp("B-01", "CLAIM · PRIVATE ALLOCATION CLAIM"),
          { kind: "p", text: "A launch publishes a Merkle root of allocations. The eligible wallet proves eligibility and designates a fresh recipient by EIP-712 signature. Tokens go straight to the recipient." },
          { kind: "kv", k: "CONTRACT", v: "PrivateClaim" },
          { kind: "kv", k: "PROVES", v: "Merkle proof + signature" },
          { kind: "kv", k: "LIMIT", v: "one claim per account" },
          { kind: "kv", k: "WINDOW", v: "closes; owner sweeps the rest" },
          { kind: "small", text: "Stock Tokens carry transfer restrictions. A fresh, unverified recipient cannot hold them." },
        ],
      },
      {
        code: "B-02",
        title: "Accumulate",
        lines: [
          ...stamp("B-02", "ACCUMULATE · STEALTH ACCUMULATION"),
          { kind: "p", text: "The treasury deposits USDG and commits a plan: a Merkle root over legs. An operator reveals and executes one leg at a time after its not-before. The unexecuted legs and the total stay hidden." },
          { kind: "kv", k: "CONTRACT", v: "StealthDesk" },
          { kind: "kv", k: "LEG", v: "recipient · token · amount · notBefore · salt" },
          { kind: "kv", k: "PUBLIC", v: "each executed payout" },
          { kind: "kv", k: "HIDDEN", v: "remaining legs, plan total" },
          { kind: "small", text: "Cancel and withdraw the balance at any time." },
        ],
      },
      {
        code: "B-03",
        title: "OTC",
        lines: [
          ...stamp("B-03", "OTC · PRIVATE OTC BLOCK"),
          { kind: "p", text: "The maker deposits asset A, names a counterparty or leaves it open, wants asset B and sets an expiry. The taker fills atomically in one transaction. Never touches a pool or an order book." },
          { kind: "kv", k: "CONTRACT", v: "OtcEscrow" },
          { kind: "kv", k: "FILL", v: "atomic, one transaction" },
          { kind: "kv", k: "RECEIVE", v: "each side into a fresh address" },
          { kind: "kv", k: "EXPIRED", v: "maker refunds" },
        ],
      },
      {
        code: "B-04",
        title: "Treasury",
        lines: [
          ...stamp("B-04", "TREASURY · DELEGATED TREASURY"),
          { kind: "p", text: "The owner funds. An operator proposes token, to and amount. An approver who is not the proposer approves. The operator executes. Four-eyes is enforced on-chain, not in a spreadsheet." },
          { kind: "kv", k: "CONTRACT", v: "DelegatedTreasury" },
          { kind: "kv", k: "CAP", v: "daily spend per token" },
          { kind: "kv", k: "APPROVER", v: "cannot be the proposer" },
          { kind: "kv", k: "OWNER", v: "withdraws any time" },
        ],
      },
      {
        code: "B-05",
        title: "What stays visible",
        lines: [
          ...stamp("B-05", "WHAT STAYS VISIBLE"),
          { kind: "p", text: "Privacy here means one thing: the wallet that owns the funds or the eligibility does not appear as the destination on-chain. Everything else is public." },
          { kind: "row", cols: ["ITEM", "VISIBLE"], head: true },
          { kind: "row", cols: ["Amounts", "yes"] },
          { kind: "row", cols: ["Timing", "yes"] },
          { kind: "row", cols: ["Desk contract address", "yes"] },
          { kind: "row", cols: ["Claim event: account → recipient", "yes"] },
          { kind: "row", cols: ["Owner wallet as destination", "no"] },
          { kind: "rule" },
          { kind: "small", text: "Correlation by amount and timing is possible. Sheaf does not claim otherwise." },
        ],
      },
    ],
  },
  {
    letter: "C",
    name: "HOW A SHEAF RUNS",
    works: [
      { code: "C-01", title: "Legs", lines: [...stamp("C-01", "1 · LEGS"), { kind: "p", text: "Pick a kind, then add legs. Paste them or drop a CSV: label, address, asset, amount, not-before, memo. Sheaf keeps the file exactly as you sent it." }, { kind: "rule", style: "dots" }, { kind: "row", cols: ["label", "address", "asset", "amount", "not-before"], head: true }, { kind: "row", cols: ["leg-01", "0x8f3…c21e", "USDG", "25,000", "09:00"] }, { kind: "row", cols: ["leg-02", "0x91d…4b7a", "USDG", "25,000", "11:30"] }, { kind: "row", cols: ["leg-03", "0x2c8…9f03", "USDG", "20,000", "14:00"] }] },
      { code: "C-02", title: "Validate", lines: [...stamp("C-02", "2 · VALIDATE"), { kind: "p", text: "Every leg is checked before anything is signed: checksum addresses, supported assets, amount precision, duplicates, not-before order, and a balance check against the funding wallet." }, { kind: "kv", k: "PASS", v: "7 legs" }, { kind: "kv", k: "WARN", v: "1 leg · memo missing" }, { kind: "kv", k: "FAIL", v: "0 legs" }, { kind: "small", text: "Stock Token legs to unverified recipients fail here, not on-chain." }] },
      { code: "C-03", title: "Route", lines: [...stamp("C-03", "3 · ROUTE"), { kind: "p", text: "Each leg gets a route. On Robinhood Chain it is a desk contract call. When funds start elsewhere, the route is quoted through Relay and shown before approval." }, { kind: "row", cols: ["LEG", "FROM", "TO", "FEE"], head: true }, { kind: "row", cols: ["01", "StealthDesk", "Robinhood", "$0.01"] }, { kind: "row", cols: ["02", "StealthDesk", "Robinhood", "$0.01"] }, { kind: "row", cols: ["03", "Base USDC", "Robinhood", "$0.38"] }] },
      { code: "C-04", title: "Approve", lines: [...stamp("C-04", "4 · APPROVE"), { kind: "p", text: "The preparer cannot approve their own sheaf. The approver sees totals per asset, the full leg list and every warning, then signs off once. Any edit invalidates the approval." }, { kind: "kv", k: "PREPARED BY", v: "desk@" }, { kind: "kv", k: "APPROVED BY", v: "cio@" }, { kind: "kv", k: "TOTAL", v: "180,000 USDG" }] },
      { code: "C-05", title: "Fund and execute", lines: [...stamp("C-05", "5 · FUND AND EXECUTE"), { kind: "p", text: "The desk contract is funded once. A worker then executes leg by leg after each not-before, with retries and idempotency keys, so a flaky RPC never double-pays." }, { kind: "row", cols: ["LEG", "STATUS", "HASH"], head: true }, { kind: "row", cols: ["01", "executed", "0x4e1…77aa"] }, { kind: "row", cols: ["02", "executed", "0xd2c…08be"] }, { kind: "row", cols: ["03", "waiting", "—"] }] },
      { code: "C-06", title: "Reconcile", lines: [...stamp("C-06", "6 · RECONCILE"), { kind: "p", text: "Executed legs are matched back to the plan, exported as CSV, and the sheaf closes with an append-only audit trail. Demo records are labelled simulated." }, { kind: "kv", k: "MATCHED", v: "8 / 8" }, { kind: "kv", k: "EXPORT", v: "sheaf-2026-09-14.csv" }, { kind: "cta", text: "READ THE DOCS →", href: "/docs" }], href: "/docs" },
    ],
  },
  {
    letter: "D",
    name: "A SAMPLE OPERATION",
    works: [
      { code: "D-01", title: "Sample plan", lines: [...stamp("D-01", "SHEAF #0142 · ACCUMULATE · SAMPLE"), { kind: "kv", k: "KIND", v: "Stealth accumulation" }, { kind: "kv", k: "CONTRACT", v: "StealthDesk" }, { kind: "kv", k: "LEGS", v: "8 · 180,000 USDG" }, { kind: "kv", k: "STATE", v: "executing · 5 executed" }, { kind: "rule", style: "dots" }, { kind: "row", cols: ["#", "RECIPIENT", "AMOUNT", "STATE"], head: true }, { kind: "row", cols: ["01", "0x8f3…c21e", "25,000 USDG", "executed"] }, { kind: "row", cols: ["02", "0x91d…4b7a", "25,000 USDG", "executed"] }, { kind: "row", cols: ["03", "0x2c8…9f03", "20,000 USDG", "executed"] }, { kind: "row", cols: ["04", "0x5a0…e118", "20,000 USDG", "executed"] }, { kind: "row", cols: ["05", "0xb77…30cd", "25,000 USDG", "executed"] }, { kind: "row", cols: ["06", "0x3e9…a4f2", "20,000 USDG", "retrying"] }, { kind: "row", cols: ["07", "hidden", "hidden", "committed"] }, { kind: "row", cols: ["08", "hidden", "hidden", "committed"] }, { kind: "rule" }, { kind: "small", text: "Sample data. Legs 07 and 08 are committed in the Merkle root and not yet revealed on-chain." }] },
      { code: "D-02", title: "Receipt", lines: [...stamp("D-02", "RECEIPT · LEG 01 · SAMPLE"), { kind: "kv", k: "TO", v: "0x8f3…c21e (fresh)" }, { kind: "kv", k: "AMOUNT", v: "25,000 USDG" }, { kind: "kv", k: "VIA", v: "StealthDesk · executeLeg" }, { kind: "kv", k: "NOT BEFORE", v: "2026-09-14 09:00:00Z" }, { kind: "kv", k: "HASH", v: "0x4e19…77aa" }, { kind: "kv", k: "EXECUTED", v: "2026-09-14 09:31:02Z" }, { kind: "kv", k: "APPROVED BY", v: "cio@" }, { kind: "rule", style: "dots" }, { kind: "small", text: "Every leg prints one of these. On-chain, the payout shows the desk contract as sender, not the treasury." }] },
      { code: "D-03", title: "Audit trail", lines: [...stamp("D-03", "AUDIT TRAIL · #0142 · SAMPLE"), { kind: "row", cols: ["09:02", "desk@", "sheaf created"] }, { kind: "row", cols: ["09:04", "system", "8 legs validated"] }, { kind: "row", cols: ["09:06", "desk@", "routes prepared"] }, { kind: "row", cols: ["09:20", "cio@", "approved"] }, { kind: "row", cols: ["09:24", "desk@", "funded · plan committed"] }, { kind: "row", cols: ["09:31", "worker", "leg 01 executed"] }, { kind: "row", cols: ["…", "", ""] }, { kind: "small", text: "Append-only. Nothing here can be edited or removed." }] },
    ],
  },
  {
    letter: "E",
    name: "SECURITY / PRIVACY",
    works: [
      { code: "E-01", title: "Security", lines: [...stamp("E-01", "SECURITY"), { kind: "p", text: "Sheaf never holds your private keys. Real mode signs with the connected wallet in the browser; the server prepares, approves and records. Four-eyes is enforced by the contracts, not only by the app." }, { kind: "kv", k: "SESSIONS", v: "httpOnly, sameSite, rotated" }, { kind: "kv", k: "HEADERS", v: "CSP, HSTS, no sniff, no frames" }, { kind: "kv", k: "AUDIT", v: "append-only, trigger-enforced" }, { kind: "cta", text: "SECURITY PAGE →", href: "/security" }], href: "/security" },
      { code: "E-02", title: "Privacy", lines: [...stamp("E-02", "PRIVACY"), { kind: "p", text: "On-chain: the owning wallet is not the destination. Amounts, timing, the desk contract and claim events are public, and correlation is possible. Off-chain: your operations, legs and approvals are yours and are not shared." }, { kind: "cta", text: "PRIVACY PAGE →", href: "/privacy" }], href: "/privacy" },
    ],
  },
  {
    letter: "F",
    name: "DOCS",
    works: [
      { code: "F-01", title: "Docs", lines: [...stamp("F-01", "DOCUMENTATION"), { kind: "kv", k: "OPERATIONS", v: "Claim · Accumulate · OTC · Treasury" }, { kind: "kv", k: "LEG CSV", v: "label, address, asset, amount, not-before, memo" }, { kind: "kv", k: "CONTRACTS", v: "PrivateClaim · StealthDesk · OtcEscrow · DelegatedTreasury" }, { kind: "kv", k: "MODES", v: "demo (simulated) · real (wallet signs)" }, { kind: "cta", text: "OPEN THE DOCS →", href: "/docs" }], href: "/docs" },
    ],
  },
  {
    letter: "G",
    name: "START",
    works: [
      { code: "G-01", title: "Start", lines: [...stamp("G-01", "START"), { kind: "p", text: "The demo desk simulates everything and labels it simulated: real validation, real route quotes, no funds moved. Switch to real mode with your own wallet on Robinhood Chain when you are ready." }, { kind: "cta", text: "OPEN THE DEMO DESK →", href: "/sign-in" }, { kind: "small", text: "Right-click the print to copy or save it." }], href: "/sign-in" },
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
