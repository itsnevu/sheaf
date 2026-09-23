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
  "/privacy": ["Stored data", "Who can access it", "What is not done", "Retention"],
};

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
 * The bench under every instrument: graph paper, rulers on two edges, registration marks in the
 * corners and a small plate that says which sheet this is. Decorative, never takes a click.
 */
export default function Backdrop() {
  const pathname = usePathname();
  const utc = useUtc();
  const sheet = SHEETS.find((x) => x.href === pathname);
  const contents = CONTENTS[pathname];
  return (
    <div className="bd" aria-hidden="true">
      <div className="bd-grid" />
      <div className="bd-ruler bd-ruler-x" />
      <div className="bd-ruler bd-ruler-y" />
      <Crop className="tl" />
      <Crop className="tr" />
      <Crop className="bl" />
      <Crop className="br" />
      <dl className="bd-plate">
        <div><dt>DESK</dt><dd>SH-4663</dd></div>
        <div><dt>CHAIN</dt><dd>ROBINHOOD · 4663</dd></div>
        <div><dt>MODE</dt><dd>DEMO</dd></div>
        <div><dt>UTC</dt><dd className="bd-clock">{utc}</dd></div>
      </dl>
      <p className="bd-sheet">
        <span className="bd-dot" />
        SHEET {sheet?.code ?? "--"}/04 · {sheet?.name ?? "SHEAF"}
      </p>
      {contents && (
        <div className="bd-card">
          <p className="bd-card-head">
            <span>INDEX CARD</span>
            <span>{sheet?.code}/04</span>
          </p>
          <ol className="bd-card-sheets">
            {SHEETS.map((x) => (
              <li key={x.href} data-on={x.href === pathname}>
                <span>{x.code}</span> {x.name}
              </li>
            ))}
          </ol>
          <p className="bd-card-sub">ON THIS SHEET</p>
          <ol className="bd-card-list">
            {contents.map((c, i) => (
              <li key={c}>
                <span>{String(i + 1).padStart(2, "0")}</span> {c}
              </li>
            ))}
          </ol>
          <p className="bd-card-foot">PRIVATE EXTERNALLY.<br />TRANSPARENT INTERNALLY.</p>
        </div>
      )}
      {contents && (
        <div className="bd-stamp">
          <b>CONTROLLED COPY</b>
          <span>SH-4663 · REV 2026.09</span>
        </div>
      )}
    </div>
  );
}
