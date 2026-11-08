"use client";

import { useEffect, useState } from "react";
import { SERIES } from "./receipts";

const STEPS = ["PREPARE", "APPROVE", "FUND", "EXECUTE", "RECONCILE", "RECORD"];

const OPS = [
  { code: "OP_01", kind: "CLAIM", contract: "PrivateClaim", line: "The eligible wallet signs; tokens go to a recipient it names, never to itself." },
  { code: "OP_02", kind: "ACCUMULATE", contract: "StealthDesk", line: "A committed plan pays out leg by leg; legs not yet run stay hidden." },
  { code: "OP_03", kind: "OTC", contract: "OtcEscrow", line: "A block trade settles both legs in one transaction, never through a pool." },
  { code: "OP_04", kind: "TREASURY", contract: "DelegatedTreasury", line: "An operator proposes, a different approver signs off, under daily caps." },
];

/** Simulated legs for the ledger and tape. Labelled DEMO everywhere they appear. */
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

/** The five legs of the live diagram, in the order the desk pays them out. */
const SIM = [
  { to: "0x7a1c…e04f", amt: "1,250 USDG" },
  { to: "0x3f9b…11ad", amt: "480 USDG" },
  { to: "0xc20e…9b73", amt: "2.4 TSLA" },
  { to: "0x5d44…a0c8", amt: "12,000 USDG" },
  { to: "0x9e07…6f12", amt: "0.85 ETH" },
];
/** One diagram cycle: each leg executes in turn, then the Rheo reconciles, then it starts over. */
const SIM_TICKS = SIM.length + 2;

function useTick(ms: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setN((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return n;
}

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

/** A mechanical counter: digits in their own windows. */
function Odometer({ label, value }: { label: string; value: number }) {
  return (
    <span className="h-odo">
      <span className="h-odo-label">{label}</span>
      <span className="h-odo-digits" aria-label={String(value)}>
        {[...pad(value, 5)].map((d, i) => (
          <b key={i}>{d}</b>
        ))}
      </span>
    </span>
  );
}

/**
 * One Rheo, drawn live: the owner funds the desk, the desk pays five legs out one at a time,
 * then the whole thing reconciles. The owner never appears on the right-hand side.
 */
function Simulator({ tick }: { tick: number }) {
  const t = tick % SIM_TICKS;
  const executing = t < SIM.length ? t : -1;
  const reconciled = t === SIM.length + 1;
  const ys = [22, 62, 102, 142, 182];
  const path = (y: number) => `M 250 102 H 360 V ${y} H 470`;
  const status = (i: number) => (reconciled ? "RECONCILED" : i < t ? "EXECUTED" : i === t ? "EXECUTING" : "APPROVED");
  return (
    <div className="h-sim" role="img" aria-label="Diagram: the owner funds the desk contract, the desk pays each leg out to its recipient, the owner is never a destination.">
      <svg viewBox="0 0 640 210" width="640" height="210">
        {/* owner → desk */}
        <rect x="12" y="76" width="118" height="52" fill="#ffffff" stroke="#1f1f1f" strokeDasharray="4 3" />
        <text x="71" y="98" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1f1f1f">OWNER WALLET</text>
        <text x="71" y="114" textAnchor="middle" fontSize="9" fill="#9a9a9a">FUNDS THE DESK</text>
        <path d="M130 102 H 150" stroke="#1f1f1f" strokeWidth="2" />
        <path d="M144 96 L 152 102 L 144 108" fill="none" stroke="#1f1f1f" strokeWidth="2" />
        {/* desk */}
        <rect x="152" y="70" width="98" height="64" fill="#1f1f1f" />
        <text x="201" y="96" textAnchor="middle" fontSize="12" fontWeight="700" fill="#ffffff">DESK</text>
        <text x="201" y="111" textAnchor="middle" fontSize="9" fill="#9a9a9a">CONTRACT · PUBLIC</text>
        <text x="201" y="124" textAnchor="middle" fontSize="9" fill={reconciled ? "#ff0000" : "#ffffff"}>{reconciled ? "RECONCILED" : `LEG ${pad(Math.min(t + 1, SIM.length))}/${pad(SIM.length)}`}</text>
        {/* legs */}
        {SIM.map((l, i) => {
          const y = ys[i]!;
          const st = status(i);
          const done = st === "EXECUTED" || st === "RECONCILED";
          return (
            <g key={l.to}>
              <path d={path(y)} fill="none" stroke={done ? "#1f1f1f" : "#bdbdbd"} strokeWidth={done ? 2 : 1.25} strokeDasharray={done ? undefined : "3 3"} />
              <rect x="470" y={y - 14} width="158" height="28" fill={st === "EXECUTING" ? "#ffe9e9" : "#ffffff"} stroke={done || st === "EXECUTING" ? "#1f1f1f" : "#bdbdbd"} />
              <text x="478" y={y - 2} fontSize="10" fontWeight="700" fill="#1f1f1f">{l.to}</text>
              <text x="478" y={y + 9} fontSize="8.5" fill="#4a4a4a">{l.amt}</text>
              <text x="622" y={y + 4} textAnchor="end" fontSize="8" fontWeight="700" fill={st === "EXECUTING" ? "#ff0000" : st === "RECONCILED" ? "#1f7a4d" : done ? "#1f1f1f" : "#9a9a9a"}>{st}</text>
              {st === "EXECUTING" && (
                <circle r="5" fill="#ff0000">
                  <animateMotion dur="1.05s" fill="freeze" path={path(y)} />
                </circle>
              )}
            </g>
          );
        })}
        <text x="360" y="206" textAnchor="middle" fontSize="8.5" fill="#9a9a9a">EVERY LEG IS A PUBLIC TRANSFER FROM THE DESK. THE OWNER IS NEVER THE DESTINATION.</text>
      </svg>
    </div>
  );
}

/**
 * The index around the printer. While the roll is empty a cover sheet fills the centre (what
 * Rheo is, one Rheo drawn live, how a Rheo runs, the four operations, what stays visible);
 * it lifts as soon as the printer starts. A series card and a spec label sit by the printer,
 * a demo leg log with counters hangs in the right margin, and a tape of legs runs along the foot.
 */
export default function HomeDeck() {
  const step = useTick(1600) % STEPS.length;
  const logTick = useTick(2600);
  const simTick = useTick(1200);
  const log = Array.from({ length: 7 }, (_, i) => {
    const n = logTick + i;
    return { n: 1 + (n % 48), ...LEGS[n % LEGS.length]! };
  }).reverse();
  const tape = [...LEGS, ...LEGS];
  const printSeries = (i: number) => window.dispatchEvent(new CustomEvent("Rheo:print", { detail: { series: i, work: 0 } }));

  return (
    <>
      <section className="h-cover" aria-label="About Rheo">
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
            <img src="/art/print/Rheo.png" alt="" width={148} height={148} />
            <figcaption>FIG. 1 · A Rheo: MANY LEGS, ONE BAND</figcaption>
          </figure>
        </div>
        <p className="h-lede">
          One controlled operation made of legs, executed from one desk. The wallet that owns the funds or the eligibility never appears as the destination on-chain.
        </p>

        <div className="h-block">
          <p className="h-label"><span>__One Rheo, drawn live</span><span><i className="h-demo">DEMO</i> 05 LEGS</span></p>
          <Simulator tick={simTick} />
        </div>

        <div className="h-block">
          <p className="h-label"><span>__How a Rheo runs</span><span>06 STEPS</span></p>
          <ol className="h-flow">
            {STEPS.map((s, i) => (
              <li key={s} data-on={i === step} data-done={i < step}>
                <span className="h-flow-n">{pad(i + 1)}</span>
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

        <div className="h-block h-cta">
          <a href="/sign-in" className="h-btn h-btn-primary">OPEN THE DESK</a>
          <a href="/docs" className="h-btn">READ THE DOCS</a>
          <a href="/security" className="h-btn">HONEST SCOPE</a>
          <span className="h-cta-note">DEMO DESK · SIGN IN AS desk@halden.example</span>
        </div>
      </section>

      <p className="h-spec" aria-hidden="true">
        <b>MODEL SH-4663</b><br />THERMAL ROLL · 7 SERIES A–G<br />DRAG ME · TURN THE DIALS
      </p>
      <p className="h-hint" aria-hidden="true"><span className="h-hint-arrow">▲</span> PRESS POWER TO PRINT</p>

      <nav className="h-series" aria-label="Print a series">
        <p className="h-series-head"><span>SERIES</span><span>PRINT →</span></p>
        <ol>
          {SERIES.map((s, i) => (
            <li key={s.letter}>
              <button type="button" onClick={() => printSeries(i)}>
                <span>{s.letter}</span> {s.name}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <aside className="h-log" aria-hidden="true">
        <p className="h-log-head"><span>LEG LOG</span><span className="h-demo">DEMO</span></p>
        <ol>
          {log.map((l, i) => (
            <li key={`${l.n}-${i}`} data-new={i === 0}>
              <span className="h-log-n">LEG {pad(l.n)}</span>
              <span className="h-log-st" data-st={l.st}>{l.st}</span>
              <span className="h-log-to">DESK → {l.to}</span>
              <span className="h-log-amt">{l.amt} {l.asset}</span>
            </li>
          ))}
        </ol>
        <div className="h-odos">
          <Odometer label="OPS" value={12 + Math.floor(logTick / 8)} />
          <Odometer label="LEGS" value={128 + logTick} />
          <Odometer label="RECONCILED" value={119 + logTick} />
        </div>
        <p className="h-log-foot">FROM: Rheo DESK CONTRACT<br />OWNER: NOT A DESTINATION</p>
      </aside>

      <div className="h-tape-run" aria-hidden="true">
        <div className="h-tape-track">
          {tape.map((l, i) => (
            <span key={i}>
              <b>LEG {pad((i % LEGS.length) + 1)}</b> DESK → {l.to} · {l.amt} {l.asset} · {l.st} <i>■</i>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
