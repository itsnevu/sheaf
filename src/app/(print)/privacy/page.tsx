import type { Metadata } from "next";
import { Section, Eyebrow } from "@/components/marketing/Section";
import PageHero from "@/components/marketing/PageHero";

export const metadata: Metadata = { title: "Privacy · Rheo", description: "What the Rheo application stores, who can access it, what is not done, and retention." };

const SECTIONS: [string, string[]][] = [
  ["Stored data", ["Account: name, email, a scrypt password hash, session tokens (hashed), and any wallet address linked by signature.", "Organisation settings, including the desk contract addresses and the funding wallet address.", "Operations: kind, name, reference, the original pasted or uploaded CSV, every leg (label, address, asset, amount, not-before, memo), validation results.", "Plans: the committed Merkle root, its salts and the unrevealed legs behind it, so an operator can reveal and execute them later.", "Routes and fee quotes returned by the route provider for cross-chain legs, including raw responses for audit.", "Approvals, funding records, execution attempts, transaction hashes, reconciliation notes.", "Audit events: who did what and when."]],
  ["Who can access it", ["Members of your organisation according to their role (Viewers see redacted addresses).", "Anyone operating the server and database.", "In real mode, Robinhood Chain and anyone reading it: the desk contract address, recipient addresses, amounts, timing and contract events. The owning wallet is not the destination; it is the funder of the contract.", "For cross-chain legs, the route provider receives the funding wallet address, the desk address and amounts for quoting and execution."]],
  ["What is not done", ["No analytics or tracking scripts are included.", "Data is not sold or shared with third parties beyond the chain itself and, for cross-chain legs, the route provider.", "Unrevealed plan legs are not published anywhere until an operator executes them.", "Rheo does not verify recipients for Robinhood Stock Tokens and does not hold private keys."]],
  ["Retention", ["Records are kept until deleted by an organisation owner or the operator.", "Audit events are append-only by application design.", "What has been written to Robinhood Chain cannot be deleted by anyone."]],
];

const PROTECTION: Array<[string, string, string]> = [
  ["Labels, memos, CSV originals", "ENCRYPTED AT REST", "Until deleted by an owner or operator"],
  ["Passwords", "SCRYPT HASH", "Never stored in clear"],
  ["Session tokens", "HASHED", "Until sign-out or expiry"],
  ["Unrevealed plan legs", "SALTED · NOT PUBLISHED", "Until executed or the plan is cancelled"],
  ["Audit events", "APPEND-ONLY", "Never edited, never deleted by the app"],
  ["Writes to Robinhood Chain", "PUBLIC · PERMANENT", "Cannot be deleted by anyone"],
];

export default function PrivacyPage() {
  return (
    <><PageHero label="PRIV_001 / REV 2026.09" title="YOUR DATA." second="THE FULL RECORD." description="What the Rheo desk stores, who can access it, and what stays on-chain. A factual description of the software."/>
    <Section tone="paper">
      <div className="container-site max-w-3xl">
        <Eyebrow>PRIV_001 · Rev 2026.09</Eyebrow>
        <h2 className="title-1 mt-2 mb-4">Privacy notice</h2>
        <p className="lede mb-12">
          What this software stores. This notice describes the data the Rheo desk stores when you use it, and what it writes to Robinhood Chain. It is a factual description of the software, not legal advice, and the organisation operating an instance is responsible for its own policies.
        </p>

        {SECTIONS.map(([title, items]) => (
          <section key={title} className="mb-10">
            <h2 className="title-2 mb-4">{title}</h2>
            <ul className="space-y-2">
              {items.map((t) => (
                <li key={t} className="text-sm leading-relaxed flex gap-2">
                  <span className="text-signal mt-0.5 flex-shrink-0">·</span>
                  <span style={{ color: "var(--muted)" }}>{t}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mb-10">
          <h2 className="title-2 mb-4">Protection and retention</h2>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Record</th>
                  <th>At rest</th>
                  <th>Lives</th>
                </tr>
              </thead>
              <tbody>
                {PROTECTION.map(([what, how, howLong]) => (
                  <tr key={what}>
                    <td className="font-medium">{what}</td>
                    <td>
                      <span className={`badge text-xs ${how.startsWith("PUBLIC") ? "badge-warning" : "badge-success"}`}>
                        {how}
                      </span>
                    </td>
                    <td className="text-sm" style={{ color: "var(--muted)" }}>{howLong}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t pt-8" style={{ borderColor: "var(--line)" }}>
          <h2 className="title-2 mb-4">Colophon</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="font-mono text-xs uppercase" style={{ color: "var(--faint)" }}>Sheet</dt>
            <dd>PRIV_001 · Rev 2026.09</dd>
            <dt className="font-mono text-xs uppercase" style={{ color: "var(--faint)" }}>Applies to</dt>
            <dd style={{ color: "var(--muted)" }}>This software as built. It changes when the software does.</dd>
            <dt className="font-mono text-xs uppercase" style={{ color: "var(--faint)" }}>Source</dt>
            <dd style={{ color: "var(--muted)" }}>docs/security/privacy-threat-model.md in the repository</dd>
            <dt className="font-mono text-xs uppercase" style={{ color: "var(--faint)" }}>Contact</dt>
            <dd style={{ color: "var(--muted)" }}>The organisation operating this instance</dd>
          </dl>
        </section>
      </div>
    </Section></>
  );
}
