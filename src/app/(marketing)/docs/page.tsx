import type { Metadata } from "next";
import Link from "next/link";
import { executionMode } from "@/lib/config";

export const metadata: Metadata = { title: "Documentation", description: "Getting started, CSV format, roles, demo vs real mode, limitations." };

const TOC = [
  ["getting-started", "Getting started"],
  ["csv", "CSV format"],
  ["workflow", "Batch workflow"],
  ["roles", "Roles and approvals"],
  ["demo", "Demo vs real mode"],
  ["execution", "Execution and retries"],
  ["reconciliation", "Reconciliation and exports"],
  ["limitations", "Known limitations"],
];

export default function DocsPage() {
  const mode = executionMode();
  return (
    <div className="n-prose container-wide grid gap-10 py-28 md:py-36 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <p className="n-label text-[var(--n-accent)] mb-3">On this page</p>
        <nav aria-label="Documentation sections" className="flex flex-wrap gap-x-4 gap-y-1 lg:flex-col">
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="text-[0.9rem] text-[var(--n-muted)] hover:text-white py-1">
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <article className="min-w-0 max-w-3xl">
        <p className="n-label text-[var(--n-accent)] mb-3">Documentation</p>
        <h1 className="n-h2">Sheaf documentation</h1>
        <p className="n-body mt-4">This instance is running in <strong>{mode}</strong> mode. Developer setup lives in the repository under <code className="font-mono text-[0.85em] text-[var(--n-accent)]">docs/development.md</code>.</p>

        <Section id="getting-started" title="Getting started">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              <Link href="/sign-up" className="n-link">Create a workspace</Link> (you become its Owner) or sign in to the seeded demo organisation.
            </li>
            <li>In Settings, confirm the asset and network. In real mode, set the treasury wallet address.</li>
            <li>Open Batches → New batch, give it a name and an optional deadline.</li>
            <li>Upload a CSV, fix any flagged rows, prepare routes, then hand it to an approver.</li>
          </ol>
          <p className="mt-4">Seeded demo accounts: owner@northwind.example, finance@northwind.example, approver@northwind.example, viewer@northwind.example, password <code className="font-mono text-[0.85em] text-[var(--n-accent)]">sheaf-demo-2026</code>.</p>
        </Section>

        <Section id="csv" title="CSV format">
          <p>Required columns: <code className="font-mono text-[0.85em] text-[var(--n-accent)]">name</code>, <code className="font-mono text-[0.85em] text-[var(--n-accent)]">address</code>, <code className="font-mono text-[0.85em] text-[var(--n-accent)]">amount</code>. Optional: <code className="font-mono text-[0.85em] text-[var(--n-accent)]">asset</code>, <code className="font-mono text-[0.85em] text-[var(--n-accent)]">reference</code>. Header aliases such as “Contractor name”, “Wallet address”, “Payment amount” and “Invoice” are recognised. Delimiters: comma, semicolon or tab. Limits: 5 MB, 10,000 rows.</p>
          <pre className="mt-4 overflow-x-auto rounded-card border border-[var(--n-line)] bg-transparent p-4 font-mono text-[0.8125rem]">{`name,address,amount,asset,reference
Ada Okafor,0x1b3f9c2a8e4d6f7a9b0c1d2e3f4a5b6c7d8e9f0a,1250.00,USDC,INV-2026-0912
Mateo Ruiz,0x9f0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e,980.50,USDC,INV-2026-0913`}</pre>
          <ul className="mt-4 list-disc space-y-1.5 pl-5">
            <li>Amounts are decimal strings. More decimals than the asset supports is an error, never rounded.</li>
            <li>Mixed-case addresses must pass the EIP-55 checksum. All-lowercase addresses are accepted.</li>
            <li>The same wallet twice in one batch is an error on the second row (merge or remove).</li>
            <li>Invalid rows are kept and shown with their errors; they can be corrected or removed in place.</li>
          </ul>
          <a href="/api/template" className="n-btn n-btn-ghost n-btn-sm n-clip mt-4">
            Download the template
          </a>
        </Section>

        <Section id="workflow" title="Batch workflow">
          <p>Statuses move strictly: Draft → Validated → Routes prepared → Approved → Funded → Executing → Completed / Partially failed / Failed. A batch can be cancelled until it is funded. Uploading a CSV never executes anything.</p>
        </Section>

        <Section id="roles" title="Roles and approvals">
          <div className="table-wrap mt-2"><table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Can</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Owner</td><td>Everything, including settings and members.</td></tr>
              <tr><td>Finance admin</td><td>Create, edit, prepare, fund, execute, retry, reconcile, export. Cannot approve.</td></tr>
              <tr><td>Approver</td><td>Approve or revoke approval, view full addresses, export.</td></tr>
              <tr><td>Viewer</td><td>Read-only with redacted addresses. No exports.</td></tr>
            </tbody>
          </table></div>
          <p className="mt-4">With four-eyes enabled (default), the person who last changed the recipient set cannot approve it. Approvals record the approver, the total and a hash of the recipient set; any edit invalidates them.</p>
        </Section>

        <Section id="demo" title="Demo vs real mode">
          <p><strong>Demo</strong> uses a deterministic mock provider: no network calls, no funds. Every route, funding record, attempt and export row is flagged simulated. Scenario triggers for testers: an address ending in <code className="font-mono text-[0.85em] text-[var(--n-accent)]">00</code> fails permanently, <code className="font-mono text-[0.85em] text-[var(--n-accent)]">ff</code> fails once then succeeds on retry, <code className="font-mono text-[0.85em] text-[var(--n-accent)]">ee</code> gets no route, and an amount of exactly 0.13 is refunded.</p>
          <p className="mt-3"><strong>Real</strong> quotes routes from Relay&rsquo;s public API and requires the configured treasury wallet to sign each route step in the browser. The server never holds a private key. Real mode has been verified for quoting and status polling; no on-chain execution was performed during development. Modes never switch silently: each batch records the mode it was created in and refuses to execute under a different one.</p>
        </Section>

        <Section id="execution" title="Execution and retries">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>One job per payment, claimed with a conditional update so two workers never run the same job.</li>
            <li>Idempotency key <code className="font-mono text-[0.85em] text-[var(--n-accent)]">exec:batch:recipient:attempt</code>; re-running a crashed job cannot send twice.</li>
            <li>A payment is never retried while its last attempt is pending, submitted or unknown. Unknown status after repeated failed checks stops polling and asks for manual review instead of resending.</li>
            <li>Retries are explicit, limited (default 3) and only offered for provider-classified transient failures.</li>
            <li>Optional spacing (jitter) between submissions is bounded to 30 minutes and never past the batch deadline.</li>
          </ul>
        </Section>

        <Section id="reconciliation" title="Reconciliation and exports">
          <p>Successful fills are marked Matched automatically with their reference and fee estimate; failures and refunds become Exceptions. Finance can override any state with a note. The CSV export contains batch, recipient, amount, network, references, statuses, attempts, fees, timestamps and a <code className="font-mono text-[0.85em] text-[var(--n-accent)]">simulated</code> column.</p>
        </Section>

        <Section id="limitations" title="Known limitations">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>No field-level encryption at rest; no immutable audit store.</li>
            <li>EVM addresses only.</li>
            <li>Real mode untested end-to-end on-chain; use Base Sepolia first.</li>
            <li>Public Relay rate limit (50 quotes/min) bounds route preparation speed without an API key.</li>
            <li>The in-process worker suits a single server; multi-instance deployments should trigger <code className="font-mono text-[0.85em] text-[var(--n-accent)]">POST /api/worker/run</code> from a scheduler instead.</li>
            <li>Same-chain, same-token routes provide no external privacy.</li>
          </ul>
        </Section>
      </article>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-24 text-[0.9375rem] leading-relaxed text-[var(--n-muted)]">
      <h2 className="n-h3 text-white mb-4">{title}</h2>
      {children}
    </section>
  );
}
