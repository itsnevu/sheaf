import Image from "next/image";
import Link from "next/link";
import { existsSync } from "node:fs";
import path from "node:path";
import Carousel from "@/components/site/Carousel";
import GlowButton from "@/components/site/GlowButton";
import HeadlineBlock from "@/components/site/HeadlineBlock";
import Scenes from "@/components/site/Scenes";
import ScrollCue from "@/components/site/ScrollCue";
import { ExecuteArt, ReviewArt, ValidateArt } from "@/components/site/StepArt";
import { Mark } from "@/components/Logo";
import { executionMode } from "@/lib/config";

const STATEMENTS = [
  { head: "Upload one CSV. Not thirty transfers.", body: "Names, wallet addresses, amounts, an optional reference. The template is one click away and header aliases are recognised." },
  { head: "Every row checked. Nothing dropped.", body: "Checksums, exact decimals, duplicates, unsupported assets. Invalid rows stay visible with the reason and are fixed in place." },
  { head: "One route per recipient. Fees shown.", body: "Each payout gets its own quoted route and readiness state. Unavailable is shown as unavailable, never as a guess." },
  { head: "Approval bound to the exact set.", body: "A second person approves a hash of the recipients. Edit a row and the approval is void until someone reviews again." },
  { head: "Executed one at a time. Tracked one at a time.", body: "A queue with idempotency keys, bounded retries and no resend through an unknown state. Completed payments stay completed." },
  { head: "Reconciled, exported, audited.", body: "References, fees, timestamps and reconciliation state in a CSV your accounting system can ingest. Simulated rows are always flagged." },
];

const FEATURES: Array<[string, string]> = [
  ["CSV payroll imports", "Template download, header aliases, files up to 10,000 rows parsed off the main thread so the page never freezes."],
  ["Payment validation", "Checksum-aware address checks, exact decimal amounts, duplicate and asset detection, with a row-level explanation for each error."],
  ["Individual route tracking", "Every recipient gets a route, a quote, its attempts and a provider reference you can inspect and copy."],
  ["Batch approvals", "Approvals bind to a hash of the recipient set, record who and when, and are invalidated by any later change."],
  ["Execution monitoring", "Live progress, per-payment timelines and an activity feed of every state change, retry and failure."],
  ["Partial-failure handling", "Completed payments stay completed. Failed ones are classified as retryable or final, with the provider's reason."],
  ["Reconciliation and exports", "Search, filter, mark matched or exception, and export a CSV with a simulated flag on every demo row."],
  ["Internal audit records", "Original CSV, approvals, funding, attempts, downloads and exports are recorded with actor and time."],
];

const STACK: Array<[string, string]> = [
  ["[Relay]", "The routing layer in real mode. Each payout is quoted through Relay's public API and signed by your wallet. Relay sees every route; its request feed is public. That is documented, not hidden."],
  ["[USDC on Base]", "The default asset and network. Same-chain routes are plain transfers with no external privacy benefit, which the review screen tells you before you approve."],
  ["[Your treasury wallet]", "Funds never leave your control before you sign. The server holds no private key; it prepares steps, records hashes and polls status."],
];

export default function HomePage() {
  const mode = executionMode();
  const hasHero = existsSync(path.join(process.cwd(), "public", "art", "hero.jpg"));
  const hasFlow = existsSync(path.join(process.cwd(), "public", "art", "flow.jpg"));

  return (
    <>
      <ScrollCue />

      {/* ───────── Hero: full viewport, left-anchored copy ───────── */}
      <section className="relative flex min-h-[100vh] w-full flex-col justify-center px-4 pb-32 pt-32 md:px-16 lg:px-[10vw]">
        <div className="flex max-w-[700px] flex-col gap-y-6 md:max-w-[560px] lg:max-w-[960px]">
          <h1 className="n-display">
            Pay thirty contractors.
            <br />
            <em>Control one batch.</em>
          </h1>
          <p className="n-body max-w-[540px] text-xl lg:text-2xl">Sheaf lets finance teams prepare, approve, coordinate and reconcile many digital-asset payouts from one place. Every recipient is validated, routed, tracked and reconciled on its own.</p>
          <p className="text-lg text-white">Private externally. Transparent internally.</p>
          <div className="flex flex-row flex-wrap items-center gap-6 md:gap-8">
            <GlowButton href="/sign-up">Open app</GlowButton>
            <GlowButton href="/#how-it-works" ghost>
              See how it works
            </GlowButton>
          </div>
        </div>
        {/* partner-style marquee at the bottom of the hero */}
        <div className="n-marquee absolute inset-x-0 bottom-20 md:bottom-16" aria-hidden="true">
          <div className="n-marquee-track n-label text-[var(--n-muted)]">
            {[0, 1].map((k) => (
              <span key={k} className="flex gap-12">
                {["EVM chains via Relay", "USDC · USDT · ETH", "Base · Arbitrum · Optimism · Ethereum", "Roles: owner · finance · approver · viewer", "Exact decimals, no floats", "Idempotent execution", mode === "demo" ? "Demo mode: simulated" : "Real mode"].map((t) => (
                  <span key={t} className="flex items-center gap-12">
                    {t} <span className="h-1.5 w-1.5 bg-[var(--n-accent)]" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Six statements, one per viewport ───────── */}
      <Scenes items={STATEMENTS} />

      {/* ───────── Definition ───────── */}
      <HeadlineBlock
        id="product"
        title={
          <>
            Sheaf is a <em className="not-italic text-[var(--n-accent)]">batch-payment control layer.</em>
          </>
        }
      >
        Most payout tools ask you to trust a button. Sheaf asks for a CSV, shows you every row, every route and every fee, waits for a second person to approve the exact set, and then executes one payment at a time with a record of everything. No claims about speed or savings. Visible, repeatable work.
      </HeadlineBlock>

      {/* ───────── Three product rows, alternating ───────── */}
      <section id="how-it-works" className="scroll-mt-24 flex flex-col gap-y-20 px-4 py-14 md:px-20 lg:px-[160px]">
        {[
          { h: ["Upload and", "validate"], p: "Drop the contractor CSV. It is parsed in a background thread and every row is checked for a valid checksummed address, an exact amount, duplicates and the right asset. Invalid rows are kept, explained and fixable in place, and the batch only moves on when every row is valid.", cta: ["/docs#csv", "Read the CSV format"], art: <ValidateArt />, flip: false },
          { h: ["Route, review,", "approve"], p: "One route and one fee quote per recipient, labelled as estimates. The review screen lists totals, funding requirement, route readiness and unresolved warnings. An approver who did not edit the rows signs off on a hash of the exact recipient set. Change a row and the approval is void.", cta: ["/docs#roles", "Roles and approvals"], art: <ReviewArt />, flip: true },
          { h: ["Execute and", "reconcile"], p: "Funding is confirmed, then each payment becomes its own job with an idempotency key. Failures are isolated and classified; retries are explicit and never sent while a previous attempt is pending or unknown. Results land in reconciliation with references, fees and an export.", cta: ["/docs#execution", "Execution and retries"], art: <ExecuteArt />, flip: false },
        ].map((row) => (
          <div key={row.h[0]} className="flex w-full flex-col-reverse gap-y-6 md:flex-row md:items-center md:gap-x-[1.7vw]">
            <div className={`z-[1] flex flex-1 shrink-0 flex-col gap-y-8 ${row.flip ? "md:order-2" : ""}`}>
              <h2 className="n-h2 text-center md:text-left">
                {row.h[0]}
                <br />
                <span className="text-[var(--n-accent)]">{row.h[1]}</span>
              </h2>
              <p className="n-body text-center md:max-w-[600px] md:text-left">{row.p}</p>
              <div className="flex justify-center md:justify-start">
                <GlowButton href={row.cta[0]} small>
                  {row.cta[1]}
                </GlowButton>
              </div>
            </div>
            <div className={`relative w-full flex-1 ${row.flip ? "md:order-1" : ""}`}>{row.art}</div>
          </div>
        ))}
      </section>

      {/* ───────── Features intro + carousel ───────── */}
      <HeadlineBlock
        id="features"
        title={
          <>
            What&rsquo;s under the <em className="not-italic text-[var(--n-accent)]">hood</em>
          </>
        }
      >
        Eight things Sheaf does on purpose: CSV imports, row-level validation, individual route tracking, hash-bound approvals, execution monitoring, partial-failure handling, reconciliation with exports, and an audit trail of every action.
      </HeadlineBlock>
      <section className="relative w-full px-0 md:px-8">
        <div className="mx-auto w-full md:max-w-[calc(90vw-9rem)] lg:max-w-[calc(90vw-16rem)]">
          <Carousel label="Features">
            {FEATURES.map(([t, d], i) => (
              <Link key={t} href="/app" className="n-glow group flex min-h-[420px] flex-col border-r border-[#404040] bg-[#0b0c0e] p-8 first:border-l md:min-h-[480px]">
                <span className="n-label text-[var(--n-accent)]">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="n-h3 mt-6">{t}</h3>
                <p className="n-body mt-4 max-w-[480px] !text-base">{d}</p>
                <span className="mt-auto pt-8 n-label text-white/70 group-hover:text-white">Open app →</span>
              </Link>
            ))}
          </Carousel>
        </div>
      </section>

      {/* ───────── Framed logo scene ───────── */}
      <section className="relative my-20 h-dvh w-full bg-black" aria-label="Sheaf mark">
        <div className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 rotate-90">
          <span className="n-bar block" />
        </div>
        <div className="grid h-full w-full grid-cols-[1fr_auto_1fr] grid-rows-[1fr_auto_1fr]">
          <div className="col-start-2 row-start-1 border-x border-neutral-800" />
          <div className="col-start-1 row-start-2 border-y border-neutral-800" />
          <div className="relative col-start-2 row-start-2 flex items-center justify-center border border-neutral-800 p-16 md:p-28">
            {[
              "left-0 top-0 border-l-2 border-t-2",
              "right-0 top-0 border-r-2 border-t-2",
              "left-0 bottom-0 border-l-2 border-b-2",
              "right-0 bottom-0 border-r-2 border-b-2",
            ].map((c) => (
              <span key={c} className={`absolute h-[10px] w-[10px] border-neutral-500 ${c}`} aria-hidden="true" />
            ))}
            <Mark size={120} inverted />
          </div>
          <div className="col-start-3 row-start-2 border-y border-neutral-800" />
          <div className="col-start-2 row-start-3 border-x border-neutral-800" />
        </div>
        <p className="absolute bottom-[12%] left-1/2 w-[260px] -translate-x-1/2 text-center n-label text-[var(--n-muted)]">Private externally · Transparent internally</p>
      </section>

      {/* ───────── About / mission / built on ───────── */}
      <HeadlineBlock
        title={
          <>
            Who it&rsquo;s for &mdash; <em className="not-italic text-[var(--n-accent)]">finance teams that pay people.</em>
          </>
        }
      >
        Operators who re-key spreadsheets into wallets, approvers who sign off on a total they cannot inspect, and auditors who rebuild the story from transaction hashes. Sheaf keeps the work in one place, in stages, with every step recorded.
      </HeadlineBlock>
      <HeadlineBlock
        title={
          <>
            Our position: <em className="not-italic text-[var(--n-accent)]">honest privacy.</em>
          </>
        }
      >
        Sheaf is designed to reduce unnecessary public linkage between treasury operations and individual payouts, subject to the capabilities and limitations of the underlying payment infrastructure. It does not make payments anonymous, and it never hides anything from your own finance team. The{" "}
        <Link href="/security" className="n-link">
          threat model
        </Link>{" "}
        says exactly what is and is not implemented.
      </HeadlineBlock>
      {(hasHero || hasFlow) && (
        <section className="mx-auto grid max-w-[1400px] gap-4 px-4 md:grid-cols-2" aria-label="Visual identity">
          {hasHero && (
            <div className="relative aspect-[16/10] overflow-hidden border border-[var(--n-line)] n-clip">
              <Image src="/art/hero.jpg" alt="Layered translucent charcoal glass sheets with one teal thread visible through the gaps." fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              <span className="absolute bottom-3 left-4 n-label text-white/80">Externally: layers</span>
            </div>
          )}
          {hasFlow && (
            <div className="relative aspect-[16/10] overflow-hidden border border-[var(--n-line)] n-clip">
              <Image src="/art/flow.jpg" alt="One large disc connected by fine teal lines to a grid of sixteen small tokens." fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              <span className="absolute bottom-3 left-4 n-label text-white/80">Internally: every route</span>
            </div>
          )}
        </section>
      )}
      <HeadlineBlock
        title={
          <>
            Built on <em className="not-italic text-[var(--n-accent)]">open rails.</em>
          </>
        }
      >
        Routes are quoted from Relay&rsquo;s public API and settled on EVM networks such as Base. Cross-chain routes are filled by a provider address rather than your treasury; same-chain routes are plain transfers. Both are labelled on the review screen, and the execution engine treats every provider answer as a state, never as a promise.
      </HeadlineBlock>

      {/* ───────── The stack ───────── */}
      <HeadlineBlock id="stack" title="The stack:" />
      <section className="relative px-6 md:px-0">
        <Carousel label="The stack" className="overflow-hidden">
          {STACK.map(([label, text]) => (
            <div key={label} className="flex h-auto flex-col gap-8 border-t border-[#262626] bg-[var(--n-card)] p-8 md:p-10">
              <p className="n-label !text-base text-white">{label}</p>
              <div className="relative mx-auto flex h-[180px] w-[180px] items-center justify-center">
                <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[var(--n-accent)]" aria-hidden="true" />
                <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[var(--n-accent)]" aria-hidden="true" />
                <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[var(--n-accent)]" aria-hidden="true" />
                <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[var(--n-accent)]" aria-hidden="true" />
                <Mark size={72} inverted />
              </div>
              <p className="flex items-start gap-x-4 text-lg text-white/85 lg:text-xl">
                <span className="mt-2 h-2 w-6 shrink-0 bg-[var(--n-accent)]" aria-hidden="true" />
                {text}
              </p>
            </div>
          ))}
        </Carousel>
      </section>

      {/* ───────── Closing ───────── */}
      <section className="px-4 py-24 text-center md:py-32">
        <h2 className="n-h2 mx-auto max-w-[20ch]">
          Batches <em className="not-italic text-[var(--n-accent)]">open</em>
        </h2>
        <p className="n-body mx-auto mt-6 max-w-[600px]">Sign in to the demo workspace with seeded batches at every stage, or create your own organisation. {mode === "demo" ? "No funds move in demo mode." : ""}</p>
        <div className="mt-10 flex flex-wrap justify-center gap-6">
          <GlowButton href="/sign-in">Open the demo workspace</GlowButton>
          <GlowButton href="/docs" ghost>
            Read the docs
          </GlowButton>
        </div>
      </section>
    </>
  );
}
