import Link from "next/link";
import { Mark } from "@/components/Logo";

const FACTS: Array<[string, string, string]> = [
  ["One route per", "recipient", ", each tracked on its own"],
  ["Approval is", "hash-bound", ": edit a row and it is void"],
  ["Amounts are", "exact", ", integer base units, no floats"],
  ["Retries are", "explicit", " and never through an unknown state"],
  ["Every action", "audited", ", every simulated record labelled"],
];

export default function SiteFooter() {
  return (
    <footer className="relative mt-24">
      <div className="flex w-full flex-col bg-black md:flex-row">
        {/* Left column: identity, facts, "everything happens in the app" */}
        <div className="flex flex-col justify-between border-b border-[var(--n-line)] px-4 py-8 md:w-[50%] md:border-b-0 md:border-r md:p-10 lg:w-[33.4vw]">
          <div className="flex flex-col gap-y-3">
            <p className="flex items-center gap-2 n-label">
              <Mark size={22} inverted /> Sheaf
            </p>
            <p className="n-body">A control layer for paying many contractors in digital assets. Upload a CSV, validate, route, approve, execute and reconcile, with every payment tracked on its own.</p>
          </div>
          <ul className="my-[60px] grid gap-4" aria-label="Key facts">
            {FACTS.map(([a, b, c]) => (
              <li key={b} className="grid grid-cols-[48px_1fr] items-center gap-2.5">
                <span className="mx-auto flex h-8 w-8 items-center justify-center border border-[var(--n-line)] n-clip" aria-hidden="true">
                  <span className="h-2 w-2 bg-[var(--n-accent)]" />
                </span>
                <p className="text-base text-[var(--n-muted)]">
                  {a} <strong className="text-white">{b}</strong>
                  {c}
                </p>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-x-4">
            <span className="h-px flex-1 bg-[var(--n-line)]" aria-hidden="true" />
            <p className="n-label">Everything happens in the app</p>
            <span className="h-px flex-1 bg-[var(--n-line)]" aria-hidden="true" />
          </div>
        </div>
        {/* Right column: link lists and legal */}
        <div className="flex flex-1 flex-col justify-between px-4 py-8 md:p-10">
          <div className="mb-20 grid w-full grid-cols-2 gap-8 lg:mb-[170px] lg:grid-cols-3">
            <ul className="flex flex-col gap-y-3">
              <li className="text-sm font-bold text-[var(--n-muted)] lg:text-base">Features</li>
              {[
                ["/#product", "Product"],
                ["/#how-it-works", "How it works"],
                ["/#features", "What's under the hood"],
                ["/#stack", "The stack"],
              ].map(([h, l]) => (
                <li key={h} className="n-label !text-sm lg:!text-base">
                  <Link href={h} className="hover:text-[var(--n-accent)]">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-y-3">
              <li className="text-sm font-bold text-[var(--n-muted)] lg:text-base">The app</li>
              {[
                ["/app", "Open app"],
                ["/sign-in", "Sign in"],
                ["/docs", "Documentation"],
                ["/api/template", "CSV template"],
              ].map(([h, l]) => (
                <li key={h} className="n-label !text-sm lg:!text-base">
                  <Link href={h} className="hover:text-[var(--n-accent)]">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="flex flex-col gap-y-3">
              <li className="text-sm font-bold text-[var(--n-muted)] lg:text-base">Trust</li>
              {[
                ["/security", "Security & privacy model"],
                ["/docs#limitations", "Known limitations"],
                ["/docs#demo", "Demo vs real mode"],
                ["/privacy", "Privacy notice"],
              ].map(([h, l]) => (
                <li key={h} className="n-label !text-sm lg:!text-base">
                  <Link href={h} className="hover:text-[var(--n-accent)]">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <ul className="flex flex-wrap gap-4 text-sm text-[var(--n-muted)] md:justify-between">
            <li>© 2026 Sheaf</li>
            <li>Evaluation software · see implementation status in the docs</li>
            <li>Privacy claims are qualified · read the threat model</li>
          </ul>
        </div>
      </div>
      <div className="overflow-hidden bg-black px-4 pb-4 pt-10 text-center md:px-10" aria-hidden="true">
        <div className="n-wordmark-huge">Sheaf</div>
      </div>
    </footer>
  );
}
