import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy · Sheaf", description: "What the Sheaf application stores, who can access it, what is not done, and retention." };

const SECTIONS: [string, string[]][] = [
  ["__Stored data", ["Account: name, email, a scrypt password hash, session tokens (hashed), and any wallet address linked by signature.", "Organisation settings, including the desk contract addresses and the funding wallet address.", "Operations: kind, name, reference, the original pasted or uploaded CSV, every leg (label, address, asset, amount, not-before, memo), validation results.", "Plans: the committed Merkle root, its salts and the unrevealed legs behind it, so an operator can reveal and execute them later.", "Routes and fee quotes returned by the route provider for cross-chain legs, including raw responses for audit.", "Approvals, funding records, execution attempts, transaction hashes, reconciliation notes.", "Audit events: who did what and when."]],
  ["__Who can access it", ["Members of your organisation according to their role (Viewers see redacted addresses).", "Anyone operating the server and database.", "In real mode, Robinhood Chain and anyone reading it: the desk contract address, recipient addresses, amounts, timing and contract events. The owning wallet is not the destination; it is the funder of the contract.", "For cross-chain legs, the route provider receives the funding wallet address, the desk address and amounts for quoting and execution."]],
  ["__What is not done", ["No analytics or tracking scripts are included.", "Data is not sold or shared with third parties beyond the chain itself and, for cross-chain legs, the route provider.", "Unrevealed plan legs are not published anywhere until an operator executes them.", "Sheaf does not verify recipients for Robinhood Stock Tokens and does not hold private keys."]],
  ["__Retention", ["Records are kept until deleted by an organisation owner or the operator.", "Audit events are append-only by application design.", "What has been written to Robinhood Chain cannot be deleted by anyone."]],
];

/** The index look: a white sheet, the mark top-left, a mono column of text, contact bottom-right. */
export default function PrivacyPage() {
  return (
    <div className="x-page">
      <div className="x-col">
        <h1 className="x-title">PRIV_### · Privacy notice</h1>
        <p className="x-lead">What this software stores. This notice describes the data the Sheaf desk stores when you use it, and what it writes to Robinhood Chain. It is a factual description of the software, not legal advice, and the organisation operating an instance is responsible for its own policies.</p>
        {SECTIONS.map(([title, items]) => (
          <section key={title} className="x-section">
            <h2 className="x-h2">{title}</h2>
            <ul className="x-list">
              {items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="x-contact">
        <a href="/security">security</a>
        <a href="/docs">docs</a>
        <a href="/sign-in">sign in</a>
      </div>
    </div>
  );
}
