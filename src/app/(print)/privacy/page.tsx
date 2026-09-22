import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy · Sheaf", description: "What the Sheaf application stores, who can access it, what is not done, and retention." };

const SECTIONS: [string, string[]][] = [
  ["__Stored data", ["Account: name, email, a scrypt password hash, session tokens (hashed).", "Organisation settings, including an optional treasury wallet address.", "Batches: name, reference, the original uploaded CSV, every recipient row (name, wallet address, amount, reference), validation results.", "Routes and fee quotes returned by the payment provider, including raw responses for audit.", "Approvals, funding records, execution attempts, transaction references, reconciliation notes.", "Audit events: who did what and when."]],
  ["__Who can access it", ["Members of your organisation according to their role (Viewers see redacted addresses).", "Anyone operating the server and database.", "In real mode, the route provider receives the treasury address, recipient addresses and amounts for quoting and execution."]],
  ["__What is not done", ["No analytics or tracking scripts are included.", "Data is not sold or shared with third parties beyond the payment provider needed to execute a batch.", "Data at rest is not encrypted at the field level in this version."]],
  ["__Retention", ["Records are kept until deleted by an organisation owner or the operator.", "Audit events are append-only by application design."]],
];

/** The index look: a white sheet, the mark top-left, a mono column of text, contact bottom-right. */
export default function PrivacyPage() {
  return (
    <div className="x-page">
      <div className="x-col">
        <h1 className="x-title">PRIV_### · Privacy notice</h1>
        <p className="x-lead">What this software stores. This notice describes the data the Sheaf application stores when you use it. It is a factual description of the software, not legal advice, and the organisation operating an instance is responsible for its own policies.</p>
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
