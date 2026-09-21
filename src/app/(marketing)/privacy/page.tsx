import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy notice", description: "What this software stores and who can access it." };

export default function PrivacyPage() {
  return (
    <div className="n-prose container-site max-w-3xl py-28 md:py-36 text-[0.9375rem] leading-relaxed text-[var(--n-muted)]">
      <p className="n-label text-[var(--n-accent)] mb-3">Privacy notice</p>
      <h1 className="n-h2 text-white">What this software stores</h1>
      <p className="mt-4">This notice describes the data the Sheaf application stores when you use it. It is a factual description of the software, not legal advice, and the organisation operating an instance is responsible for its own policies.</p>
      <h2 className="n-h3 text-white mt-12 mb-3">Stored data</h2>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>Account: name, email, a scrypt password hash, session tokens (hashed).</li>
        <li>Organisation settings, including an optional treasury wallet address.</li>
        <li>Batches: name, reference, the original uploaded CSV, every recipient row (name, wallet address, amount, reference), validation results.</li>
        <li>Routes and fee quotes returned by the payment provider, including raw responses for audit.</li>
        <li>Approvals, funding records, execution attempts, transaction references, reconciliation notes.</li>
        <li>Audit events: who did what and when.</li>
      </ul>
      <h2 className="n-h3 text-white mt-12 mb-3">Who can access it</h2>
      <p>Members of your organisation according to their role (Viewers see redacted addresses). Anyone operating the server and database. In real mode, the route provider receives the treasury address, recipient addresses and amounts for quoting and execution.</p>
      <h2 className="n-h3 text-white mt-12 mb-3">What is not done</h2>
      <p>No analytics or tracking scripts are included. Data is not sold or shared with third parties beyond the payment provider needed to execute a batch. Data at rest is not encrypted at the field level in this version.</p>
      <h2 className="n-h3 text-white mt-12 mb-3">Retention</h2>
      <p>Records are kept until deleted by an organisation owner or the operator. Audit events are append-only by application design.</p>
    </div>
  );
}
