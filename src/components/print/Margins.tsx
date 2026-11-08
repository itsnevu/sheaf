"use client";

import { usePathname } from "next/navigation";

/** Terms the documentation uses, pinned beside the reader. */
const GLOSSARY: Array<[string, string]> = [
  ["SHEAF", "One controlled operation made of legs, run from one desk."],
  ["LEG", "One transfer: recipient, asset, amount, not-before, memo."],
  ["DESK", "The contract that holds the funds and pays each leg out."],
  ["PLAN", "A Merkle-committed list of legs, revealed one at a time."],
  ["NOT-BEFORE", "The earliest moment a leg may execute."],
  ["FOUR-EYES", "The approver must be a different address from the proposer."],
  ["RECONCILE", "Match every executed leg to its reference and note it."],
  ["ROLL", "One topic on this reader. Arrow keys turn it."],
];

/**
 * Who can see what, condensed from docs/security/privacy-threat-model.md.
 * ● visible · ◐ redacted · ○ not visible. Columns: desk address, recipients, amounts,
 * labels and memos, legs not yet executed.
 */
const OBSERVERS: Array<[string, string, string]> = [
  ["Block explorers, indexers", "●●●○○", "all on-chain data"],
  ["Validators, sequencer, RPC", "●●●○○", "plus submitting IP"],
  ["Route provider (Relay)", "●●●○○", "cross-chain legs only"],
  ["Wallet provider", "●●●○○", "every signed transaction"],
  ["Raqio hosting operators", "●●●●●", "everything in the database"],
  ["Your desk operators", "●●●●●", "by design"],
  ["Your viewers", "●◐●●○", "addresses redacted"],
];
const COLS = ["DESK", "RCPT", "AMT", "MEMO", "PLAN"];

/** Cards in the margins of the docs and security sheets. Decorative, never in the way. */
export default function Margins() {
  const pathname = usePathname();
  if (pathname === "/docs") {
    return (
      <aside className="mg mg-gloss" aria-label="Glossary">
        <p className="mg-head"><span>GLOSSARY</span><span>08 TERMS</span></p>
        <dl>
          {GLOSSARY.map(([t, d]) => (
            <div key={t}>
              <dt>{t}</dt>
              <dd>{d}</dd>
            </div>
          ))}
        </dl>
        <p className="mg-sub">LEG CSV · COLUMNS IN ORDER</p>
        <pre className="mg-csv">label,address,asset,amount,not-before,memo{"\n"}leg-01,0x8f3…c21e,USDG,25000,,{"\n"}leg-02,0x91d…4b7a,USDG,25000,,</pre>
        <p className="mg-foot">REQUIRED: ADDRESS · ASSET · AMOUNT<br />TEMPLATE: GET /api/template</p>
      </aside>
    );
  }
  if (pathname === "/security") {
    return (
      <>
        <aside className="mg mg-matrix" aria-label="Who can see what">
          <p className="mg-head"><span>WHO SEES WHAT</span><span>ON-CHAIN + OFF</span></p>
          <table>
            <thead>
              <tr>
                <th scope="col">OBSERVER</th>
                {COLS.map((c) => (
                  <th key={c} scope="col">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OBSERVERS.map(([who, cells, note]) => (
                <tr key={who}>
                  <th scope="row">
                    {who}
                    <small>{note}</small>
                  </th>
                  {[...cells].map((c, i) => (
                    <td key={i} data-v={c}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mg-foot">● VISIBLE · ◐ REDACTED · ○ NOT VISIBLE<br />THE OWNING WALLET IS NEVER A DESTINATION.<br />IT IS THE FUNDER OF THE DESK, AND THAT IS PUBLIC.</p>
        </aside>
        <aside className="mg mg-words" aria-label="Words we do not use">
          <p className="mg-head"><span>WORDS WE DO NOT USE</span></p>
          <ul>
            {["ANONYMOUS", "UNTRACEABLE", "UNLINKABLE", "INVISIBLE"].map((w) => (
              <li key={w}><s>{w}</s></li>
            ))}
          </ul>
          <p className="mg-foot">IF YOU SEE ONE OF THESE IN SHEAF, IT IS A BUG.</p>
        </aside>
      </>
    );
  }
  return null;
}
