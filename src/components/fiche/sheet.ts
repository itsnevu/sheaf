/**
 * Draws the security and privacy model as one microfiche sheet: a grid of framed panels on a
 * pale card, read by panning and zooming in the viewer. Text is Sheaf's own security page.
 */
export const SHEET_SIZE = 1600;

const OBSERVERS: [string, string][] = [
  ["Block explorers, indexers, analytics firms", "All on-chain data: sender, receiver, amount, token, time, calldata."],
  ["Validators, sequencers, RPC providers", "The same, plus the submitting IP and mempool timing."],
  ["Route provider (Relay) and its solvers", "Every quote, deposit and fill. Its public request feed lists user → recipient pairs without authentication (verified)."],
  ["Wallet providers", "The treasury address, every signed transaction, the dapp origin."],
  ["Sheaf hosting operators", "Everything in the database, including names, references and the original CSV."],
  ["Your finance administrators and approvers", "Everything in your organisation, by design. Viewers see redacted addresses."],
];

const IMPLEMENTED = [
  "Roles (Owner, Finance admin, Approver, Viewer) enforced on the server in every API route.",
  "Organisation isolation: every query is scoped by the session's organisation, never by a client-supplied id.",
  "Viewers receive redacted addresses from the API, not only in the UI.",
  "Four-eyes approval: the last editor of the recipient set cannot approve it (configurable).",
  "Approvals bind to a hash of the recipient set and are invalidated by any change.",
  "Append-only audit events for every state change, download and export, enforced by the data layer and by database triggers.",
  "Contractor names, internal references and CSV originals are encrypted at rest (AES-256-GCM).",
  "Rate-limited sign-in and sign-up; the server refuses to start in production with placeholder secrets.",
  "Idempotency keys and a duplicate-send guard: a payment is never re-sent while its last attempt is pending or unknown.",
  "Optional bounded spacing between submissions (0–30 min), off by default, timestamps kept internally.",
];

const NOT_IMPLEMENTED = [
  "Externally anchored audit storage (the audit table is append-only inside the database, not written to a separate ledger).",
  "Per-organisation encryption keys in a KMS; one server-side key encrypts every organisation.",
  "Mixing, shielded pools, zero-knowledge transfers or any privacy protocol.",
  "Address validation for non-EVM networks.",
  "Hardware-key or SSO authentication; sessions are cookie-based with scrypt password hashing.",
];

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

export function renderSheet(textFont: string, labelFont: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = SHEET_SIZE;
  c.height = SHEET_SIZE;
  const ctx = c.getContext("2d")!;
  // Card
  ctx.fillStyle = "#e9ebe6";
  ctx.fillRect(0, 0, SHEET_SIZE, SHEET_SIZE);
  ctx.strokeStyle = "#8a8f88";
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, SHEET_SIZE - 80, SHEET_SIZE - 80);
  // Registration marks
  ctx.strokeStyle = "#5d625c";
  ctx.lineWidth = 2;
  for (const [x, y] of [
    [90, 90],
    [SHEET_SIZE - 90, 90],
    [90, SHEET_SIZE - 90],
    [SHEET_SIZE - 90, SHEET_SIZE - 90],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x! - 24, y!);
    ctx.lineTo(x! + 24, y!);
    ctx.moveTo(x!, y! - 24);
    ctx.lineTo(x!, y! + 24);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x!, y!, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  const ink = "#1f2420";
  // Header strip
  ctx.fillStyle = "#d3d6cf";
  ctx.fillRect(120, 110, SHEET_SIZE - 240, 96);
  ctx.fillStyle = ink;
  ctx.font = `600 34px ${labelFont}`;
  ctx.textBaseline = "middle";
  ctx.fillText("SHEAF  ·  SECURITY & PRIVACY MODEL  ·  FICHE 01", 150, 158);
  ctx.font = `18px ${labelFont}`;
  ctx.textAlign = "right";
  ctx.fillText("docs/security/privacy-threat-model.md", SHEET_SIZE - 150, 158);
  ctx.textAlign = "left";

  // Title block
  ctx.font = `700 46px ${textFont}`;
  ctx.textBaseline = "top";
  ctx.fillText("HONEST SCOPE: WHAT SHEAF PROTECTS,", 130, 240);
  ctx.fillText("AND WHAT IT CANNOT.", 130, 296);
  ctx.font = `21px ${textFont}`;
  let y = 372;
  for (const line of wrap(ctx, "Sheaf is designed to reduce unnecessary public linkage between treasury operations and individual payouts, subject to the capabilities and limitations of the underlying payment infrastructure. This sheet summarises the full threat model kept in the repository.", 1000)) {
    ctx.fillText(line, 130, y);
    y += 28;
  }

  const panel = (x: number, py: number, w: number, h: number, title: string) => {
    ctx.fillStyle = "#f3f4f0";
    ctx.fillRect(x, py, w, h);
    ctx.strokeStyle = "#6c716a";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, py, w, h);
    ctx.fillStyle = "#1f2420";
    ctx.fillRect(x, py, w, 30);
    ctx.fillStyle = "#e9ebe6";
    ctx.font = `600 16px ${labelFont}`;
    ctx.textBaseline = "middle";
    ctx.fillText(title, x + 12, py + 15);
    ctx.textBaseline = "top";
    ctx.fillStyle = ink;
  };

  // Who can see what (table)
  panel(120, 500, 800, 560, "WHO CAN SEE WHAT");
  ctx.font = `600 16px ${textFont}`;
  ctx.fillText("OBSERVER", 136, 546);
  ctx.fillText("VISIBLE TO THEM", 420, 546);
  ctx.fillStyle = "#6c716a";
  ctx.fillRect(136, 568, 768, 1);
  y = 582;
  for (const [o, v] of OBSERVERS) {
    ctx.fillStyle = ink;
    ctx.font = `600 15px ${textFont}`;
    const ol = wrap(ctx, o, 260);
    ctx.font = `15px ${textFont}`;
    const vl = wrap(ctx, v, 470);
    ctx.font = `600 15px ${textFont}`;
    ol.forEach((l, i) => ctx.fillText(l, 136, y + i * 20));
    ctx.font = `15px ${textFont}`;
    vl.forEach((l, i) => ctx.fillText(l, 420, y + i * 20));
    y += Math.max(ol.length, vl.length) * 20 + 14;
    ctx.fillStyle = "#c9ccc4";
    ctx.fillRect(136, y - 7, 768, 1);
  }

  // Implemented
  panel(950, 500, 530, 560, "IMPLEMENTED AND TESTED");
  ctx.font = `14px ${textFont}`;
  y = 544;
  for (const t of IMPLEMENTED) {
    const lines = wrap(ctx, t, 470);
    ctx.fillStyle = "#2f6d4a";
    ctx.fillText("✓", 964, y);
    ctx.fillStyle = ink;
    lines.forEach((l, i) => ctx.fillText(l, 986, y + i * 18));
    y += lines.length * 18 + 8;
  }

  // Not implemented
  panel(120, 1090, 560, 300, "NOT IMPLEMENTED");
  ctx.font = `14px ${textFont}`;
  y = 1134;
  for (const t of NOT_IMPLEMENTED) {
    const lines = wrap(ctx, t, 500);
    ctx.fillStyle = "#9a2b22";
    ctx.fillText("✕", 134, y);
    ctx.fillStyle = ink;
    lines.forEach((l, i) => ctx.fillText(l, 156, y + i * 18));
    y += lines.length * 18 + 8;
  }

  // On-chain reality
  panel(710, 1090, 770, 300, "ON-CHAIN REALITY");
  ctx.font = `600 15px ${textFont}`;
  ctx.fillText("SAME CHAIN, SAME TOKEN (DEFAULT)", 726, 1134);
  ctx.font = `14px ${textFont}`;
  y = 1156;
  for (const l of wrap(ctx, "The route provider returns a plain token transfer from the treasury to the recipient. On-chain this is identical to paying directly: no privacy benefit. Sheaf labels these routes “Direct transfer” on the review screen.", 350)) {
    ctx.fillText(l, 726, y);
    y += 18;
  }
  ctx.font = `600 15px ${textFont}`;
  ctx.fillText("CROSS-CHAIN OR CROSS-TOKEN", 1100, 1134);
  ctx.font = `14px ${textFont}`;
  y = 1156;
  for (const l of wrap(ctx, "The treasury deposits with the provider on the origin chain; a provider solver pays the recipient on the destination chain. The recipient's incoming transaction does not name the treasury, but amounts, timing and the provider's public request listing still correlate the two. This is obfuscation against casual inspection, not unlinkability.", 350)) {
    ctx.fillText(l, 1100, y);
    y += 18;
  }

  // Words we do not use
  ctx.fillStyle = "#1f2420";
  ctx.fillRect(120, 1420, 1360, 100);
  ctx.fillStyle = "#e9ebe6";
  ctx.font = `600 16px ${labelFont}`;
  ctx.fillText("WORDS WE DO NOT USE", 140, 1436);
  ctx.font = `700 26px ${textFont}`;
  ctx.fillText("Anonymous.  Untraceable.  Unlinkable.  Invisible.  Private transactions.", 140, 1462);
  ctx.font = `15px ${textFont}`;
  ctx.fillText("If you see any of these in Sheaf, it is a bug.", 140, 1496);

  // Footer
  ctx.fillStyle = "#5d625c";
  ctx.font = `14px ${labelFont}`;
  ctx.fillText("Sheaf Ltd.        sec-01.des        AES-256-GCM        Append-only audit        EVM only", 130, 1548);
  return c;
}
