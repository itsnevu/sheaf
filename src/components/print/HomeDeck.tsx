"use client";

import { useEffect, useState } from "react";

const STEPS = ["PREPARE", "APPROVE", "FUND", "EXECUTE", "RECONCILE", "RECORD"];

const OPS = [
  { code: "OP_01", kind: "CLAIM", contract: "PrivateClaim", line: "The eligible wallet signs; tokens go to a recipient it names, never to itself." },
  { code: "OP_02", kind: "ACCUMULATE", contract: "StealthDesk", line: "A committed plan pays out leg by leg; legs not yet run stay hidden." },
  { code: "OP_03", kind: "OTC", contract: "OtcEscrow", line: "A block trade settles both legs in one transaction, never through a pool." },
  { code: "OP_04", kind: "TREASURY", contract: "DelegatedTreasury", line: "An operator proposes, a different approver signs off, under daily caps." },
];

/** Simulated legs for the ledger and ticker. Labelled DEMO everywhere they appear. */
const LEGS = [
  { to: "0x7a1c…e04f", amt: "1,250.00", asset: "USDG", st: "EXECUTED" },
  { to: "0x3f9b…11ad", amt: "480.00", asset: "USDG", st: "EXECUTED" },
  { to: "0xc20e…9b73", amt: "2.400", asset: "TSLA", st: "FUNDED" },
  { to: "0x5d44…a0c8", amt: "12,000.00", asset: "USDG", st: "APPROVED" },
  { to: "0x9e07…6f12", amt: "0.850", asset: "ETH", st: "EXECUTED" },
  { to: "0x18ab…d3e9", amt: "3,300.00", asset: "USDG", st: "RECONCILED" },
  { to: "0xb6f2…4c51", amt: "7.000", asset: "AAPL", st: "PREPARED" },
  { to: "0x42d8…8e2a", amt: "925.50", asset: "USDG", st: "EXECUTED" },
];

function useTick(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setN((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return n;
}

/**
 * The index around the printer. While the roll is empty a cover sheet fills the centre (what
 * Sheaf is, how a sheaf runs, the four operations, what stays visible); it lifts as soon as the
 * printer starts. A demo leg log hangs in the right margin and a tape of legs runs along the foot.
 */
export default function HomeDeck() {
  const step = useTick(1600) % STEPS.length;
  const logTick = useTick(2600);
  const log = Array.from({ length: 7 }, (_, i) => {
    const n = logTick + i;
    return { n: 1 + (n % 48), ...LEGS[n % LEGS.length] };
  }).reverse();
  const tape = [...LEGS, ...LEGS];

  return (
    <>
      <section className="h-cover" aria-label="About Sheaf">
        <p className="h-eyebrow">SH-4663 · THE PRIVATE EXECUTION DESK · ROBINHOOD CHAIN</p>
        <div className="h-head">
          <h2 className="h-title">
            PRIVATE<br />EXTERNALLY<span className="h-red">.</span><br />
            <span className="h-outline">TRANSPARENT</span><br />
            <span className="h-outline">INTERNALLY</span><span className="h-red">.</span>
          </h2>
          <figure className="h-pin">
            <span className="h-tape h-tape-a" />
            <span className="h-tape h-tape-b" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/art/print/sheaf.png" alt="" width={148} height={148} />
            <figcaption>FIG. 1 · A SHEAF: MANY LEGS, ONE BAND</figcaption>
          </figure>
        </div>
        <p className="h-lede">
          One controlled operation made of legs, executed from one desk. The wallet that owns the funds or the eligibility never appears as the destination on-chain.
        </p>

        <div className="h-block">
          <p className="h-label"><span>__How a sheaf runs</span><span>06 STEPS</span></p>
          <ol className="h-flow">
            {STEPS.map((s, i) => (
              <li key={s} data-on={i === step} data-done={i < step}>
                <span className="h-flow-n">{String(i + 1).padStart(2, "0")}</span>
                <span className="h-flow-s">{s}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="h-block">
          <p className="h-label"><span>__Four operations</span><span>ONE CONTRACT EACH</span></p>
          <ul className="h-ops">
            {OPS.map((o) => (
              <li key={o.kind}>
                <span className="h-op-code">{o.code}</span>
                <span className="h-op-kind">{o.kind}</span>
                <span className="h-op-line">{o.line}</span>
                <span className="h-op-ct">{o.contract}.sol</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="h-block h-vis">
          <div>
            <p className="h-label"><span>__Stays public</span></p>
            <ul className="h-list">
              <li>Amounts and timing</li>
              <li>The desk contract address</li>
              <li>Every event the contract emits</li>
            </ul>
          </div>
          <div>
            <p className="h-label"><span>__Not the destination</span></p>
            <ul className="h-list h-list-x">
              <li>The wallet that owns the funds</li>
              <li>The wallet that holds the eligibility</li>
              <li>Your internal labels and memos</li>
            </ul>
          </div>
        </div>
      </section>

      <p className="h-spec" aria-hidden="true">
        <b>MODEL SH-4663</b><br />THERMAL ROLL · 7 SERIES A–G<br />DRAG ME · TURN THE DIALS
      </p>
      <p className="h-hint" aria-hidden="true"><span className="h-hint-arrow">▲</span> PRESS POWER TO PRINT</p>

      <aside className="h-log" aria-hidden="true">
        <p className="h-log-head"><span>LEG LOG</span><span className="h-demo">DEMO</span></p>
        <ol>
          {log.map((l, i) => (
            <li key={`${l.n}-${i}`} data-new={i === 0}>
              <span className="h-log-n">LEG {String(l.n).padStart(2, "0")}</span>
              <span className="h-log-st" data-st={l.st}>{l.st}</span>
              <span className="h-log-to">DESK → {l.to}</span>
              <span className="h-log-amt">{l.amt} {l.asset}</span>
            </li>
          ))}
        </ol>
        <p className="h-log-foot">FROM: SHEAF DESK CONTRACT<br />OWNER: NOT A DESTINATION</p>
      </aside>

      <div className="h-tape-run" aria-hidden="true">
        <div className="h-tape-track">
          {tape.map((l, i) => (
            <span key={i}>
              <b>LEG {String(i % LEGS.length + 1).padStart(2, "0")}</b> DESK → {l.to} · {l.amt} {l.asset} · {l.st} <i>■</i>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
