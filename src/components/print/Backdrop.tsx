"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ROLLS } from "@/components/reader/rolls";

const SHEETS = [
  { href: "/", code: "01", name: "INDEX" },
  { href: "/docs", code: "02", name: "DOCS" },
  { href: "/security", code: "03", name: "SECURITY" },
  { href: "/privacy", code: "04", name: "PRIVACY" },
];

/** What each sheet holds, for the index card in the left margin. */
const CONTENTS: Record<string, string[]> = {
  "/docs": ROLLS.map((r) => r.title),
  "/security": ["Who can see what", "Implemented and tested", "Not implemented", "On-chain reality", "Cross-chain legs", "Words we do not use"],
  "/privacy": ["Stored data", "Who can access it", "What is not done", "Retention", "Protection and retention", "Colophon"],
};

/** Desk sections, for the sheet label when the bench is under the application. */
const DESK: Array<[string, string, string]> = [
  ["/app/batches", "APP_002", "OPERATIONS"],
  ["/app/executions", "APP_003", "EXECUTIONS"],
  ["/app/payments", "APP_003", "EXECUTIONS"],
  ["/app/reconciliation", "APP_004", "RECONCILIATION"],
  ["/app/activity", "APP_005", "ACTIVITY"],
  ["/app/settings", "APP_006", "SETTINGS"],
  ["/app", "APP_001", "OVERVIEW"],
];

function useUtc() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () => setNow(new Date().toISOString().slice(11, 19));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** The reader announces which roll is open; the index card follows it. */
function useOpenRoll() {
  const [roll, setRoll] = useState(0);
  useEffect(() => {
    const on = (e: Event) => setRoll((e as CustomEvent<number>).detail);
    window.addEventListener("Raqio:roll", on);
    return () => window.removeEventListener("Raqio:roll", on);
  }, []);
  return roll;
}

/** Crop mark: a crosshair in a circle, the registration mark printers put on every sheet. */
function Crop({ className }: { className: string }) {
  return (
    <svg className={`bd-crop ${className}`} viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <circle cx="14" cy="14" r="7" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M14 0v28M0 14h28" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/**
 * The bench under every sheet: graph paper, rulers on two edges and registration marks in the
 * corners, all beneath the instruments. Above them float a plate that says which desk and mode
 * this is and a label that says which sheet. On the site the overlay also carries an index card
 * (the sheet's contents, clickable on the docs sheet) and a controlled-copy stamp. Under the
 * application (`variant="desk"`) the paper is fainter and the card and stamp are left off.
 */
export default function Backdrop({ mode = "demo", variant = "site", role }: { mode?: "demo" | "real"; variant?: "site" | "desk"; role?: string }) {
  const pathname = usePathname();
  const utc = useUtc();
  const openRoll = useOpenRoll();
  const sheet = SHEETS.find((x) => x.href === pathname);
  const contents = variant === "site" ? CONTENTS[pathname] : undefined;
  const desk = variant === "desk" ? DESK.find(([p]) => pathname.startsWith(p)) : undefined;
  const isDocs = pathname === "/docs";
  const label = desk ? `${desk[1]} · ${desk[2]}` : pathname.startsWith("/sign-") ? "SHEET 00/04 · ACCESS" : `SHEET ${sheet?.code ?? "--"}/04 · ${sheet?.name ?? "Raqio"}`;
  const openRollDoc = (i: number) => window.dispatchEvent(new CustomEvent("Raqio:roll:set", { detail: i }));

  return (
    <>
      <div className="bd" data-variant={variant} aria-hidden="true">
        <div className="bd-grid" />
        <div className="bd-ruler bd-ruler-x" />
        <div className="bd-ruler bd-ruler-y" />
        <Crop className="tl" />
        <Crop className="tr" />
        <Crop className="bl" />
        <Crop className="br" />
      </div>
      <div className="bd-over" data-variant={variant}>
        <dl className="bd-plate" aria-hidden="true">
          <div><dt>DESK</dt><dd>RH-99801</dd></div>
          <div><dt>CHAIN</dt><dd>ELYSIUM · 99801</dd></div>
          <div><dt>MODE</dt><dd data-mode={mode}>{mode.toUpperCase()}</dd></div>
          {role && <div><dt>ROLE</dt><dd>{role.toUpperCase()}</dd></div>}
          <div><dt>UTC</dt><dd className="bd-clock">{utc}</dd></div>
        </dl>
        <p className="bd-sheet" aria-hidden="true">
          <span className="bd-dot" />
          {label}
        </p>
        {contents && (
          <nav className="bd-card" aria-label="Index card">
            <p className="bd-card-head">
              <span>INDEX CARD</span>
              <span>{sheet?.code}/04</span>
            </p>
            <ol className="bd-card-sheets">
              {SHEETS.map((x) => (
                <li key={x.href} data-on={x.href === pathname}>
                  {x.href === pathname ? (
                    <span aria-current="page"><span>{x.code}</span> {x.name}</span>
                  ) : (
                    <a href={x.href}><span>{x.code}</span> {x.name}</a>
                  )}
                </li>
              ))}
            </ol>
            <p className="bd-card-sub">ON THIS SHEET</p>
            <ol className="bd-card-list">
              {contents.map((c, i) => (
                <li key={c} data-on={isDocs && i === openRoll}>
                  {isDocs ? (
                    <button type="button" onClick={() => openRollDoc(i)} aria-label={`Open roll ${String(i + 1).padStart(2, "0")}: ${c}`}>
                      <span>{String(i + 1).padStart(2, "0")}</span> {c}
                    </button>
                  ) : (
                    <>
                      <span>{String(i + 1).padStart(2, "0")}</span> {c}
                    </>
                  )}
                </li>
              ))}
            </ol>
            <p className="bd-card-foot">PRIVATE EXTERNALLY.<br />TRANSPARENT INTERNALLY.</p>
          </nav>
        )}
        {contents && (
          <div className="bd-stamp" aria-hidden="true">
            <b>CONTROLLED COPY</b>
            <span>RH-99801 · REV 2026.09</span>
          </div>
        )}
      </div>
    </>
  );
}
