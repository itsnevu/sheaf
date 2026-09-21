import type { Metadata } from "next";
import Link from "next/link";
import { IconArrow } from "@/components/ui";

export const metadata: Metadata = { title: "Security & privacy model", description: "What Sheaf protects, what it cannot, and who can see what." };

const OBSERVERS: Array<[string, string]> = [
  ["Block explorers, indexers, analytics firms", "All on-chain data: sender, receiver, amount, token, time, calldata."],
  ["Validators, sequencers, RPC providers", "The same, plus the submitting IP and mempool timing."],
  ["Route provider (Relay) and its solvers", "Every quote, deposit and fill. Its public request feed lists user → recipient pairs without authentication (verified)."],
  ["Wallet providers", "The treasury address, every signed transaction, the dapp origin."],
  ["Sheaf hosting operators", "Everything in the database, including names, references and the original CSV."],
  ["Your finance administrators and approvers", "Everything in your organisation, by design. Viewers see redacted addresses."],
];

export default function SecurityPage() {
  return (
    <div className="n-prose container-site py-28 md:py-36">
      <p className="n-label text-[var(--n-accent)] mb-3">Security &amp; privacy</p>
      <h1 className="n-h2 max-w-3xl">Honest scope: what Sheaf protects, and what it cannot.</h1>
      <p className="n-body mt-6 max-w-2xl">
        Sheaf is designed to reduce unnecessary public linkage between treasury operations and individual payouts, subject to the capabilities and limitations of the underlying payment infrastructure. This page summarises the full threat model kept in the repository at <code className="font-mono text-[0.85em] text-[var(--n-accent)]">docs/security/privacy-threat-model.md</code>.
      </p>

      <section className="mt-16">
        <h2 className="n-h3">Who can see what</h2>
        <div className="mt-6 overflow-hidden rounded-panel border border-[var(--n-line)]">
          <table className="table">
            <thead>
              <tr>
                <th>Observer</th>
                <th>Visible to them</th>
              </tr>
            </thead>
            <tbody>
              {OBSERVERS.map(([o, v]) => (
                <tr key={o}>
                  <td className="font-medium align-top">{o}</td>
                  <td className="text-[var(--n-muted)]">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-2">
        <div className="n-panel n-clip p-6">
          <h2 className="n-h3">What is implemented and tested</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-[var(--n-muted)]">
            <li>Roles (Owner, Finance admin, Approver, Viewer) enforced on the server in every API route.</li>
            <li>Organisation isolation: every query is scoped by the session&rsquo;s organisation, never by a client-supplied id.</li>
            <li>Viewers receive redacted addresses from the API, not only in the UI.</li>
            <li>Four-eyes approval: the last editor of the recipient set cannot approve it (configurable).</li>
            <li>Approvals bind to a hash of the recipient set and are invalidated by any change.</li>
            <li>Append-only audit events for every state change, download and export, enforced by the data layer and by database triggers.</li>
            <li>Contractor names, internal references and CSV originals are encrypted at rest (AES-256-GCM).</li>
            <li>Rate-limited sign-in and sign-up; the server refuses to start in production with placeholder secrets.</li>
            <li>Idempotency keys and a duplicate-send guard: a payment is never re-sent while its last attempt is pending or unknown.</li>
            <li>Optional bounded spacing between submissions (0–30 min), off by default, timestamps kept internally.</li>
          </ul>
        </div>
        <div className="n-panel n-clip p-6">
          <h2 className="n-h3">What is not implemented</h2>
          <ul className="mt-4 space-y-2.5 text-[0.9375rem] text-[var(--n-muted)]">
            <li>Externally anchored audit storage (the audit table is append-only inside the database, not written to a separate ledger).</li>
            <li>Per-organisation encryption keys in a KMS; one server-side key encrypts every organisation.</li>
            <li>Mixing, shielded pools, zero-knowledge transfers or any privacy protocol.</li>
            <li>Address validation for non-EVM networks.</li>
            <li>Hardware-key or SSO authentication; sessions are cookie-based with scrypt password hashing.</li>
          </ul>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="n-h3">On-chain reality</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="n-panel n-clip p-6">
            <h3 className="n-label !text-sm">Same chain, same token (default)</h3>
            <p className="mt-2 text-[0.9375rem] text-[var(--n-muted)]">The route provider returns a plain token transfer from the treasury to the recipient. On-chain this is identical to paying directly: no privacy benefit. Sheaf labels these routes “Direct transfer” on the review screen.</p>
          </div>
          <div className="n-panel n-clip p-6">
            <h3 className="n-label !text-sm">Cross-chain or cross-token</h3>
            <p className="mt-2 text-[0.9375rem] text-[var(--n-muted)]">The treasury deposits with the provider on the origin chain; a provider solver pays the recipient on the destination chain. The recipient&rsquo;s incoming transaction does not name the treasury, but amounts, timing and the provider&rsquo;s public request listing still correlate the two. This is obfuscation against casual inspection, not unlinkability.</p>
          </div>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="n-h3">Words we do not use</h2>
        <p className="mt-4 max-w-2xl text-[0.9375rem] text-[var(--n-muted)]">Anonymous. Untraceable. Unlinkable. Invisible. Private transactions. If you see any of these in Sheaf, it is a bug.</p>
        <Link href="/docs#limitations" className="n-btn n-btn-ghost n-clip mt-8">
          Known limitations in the docs <IconArrow />
        </Link>
      </section>
    </div>
  );
}
