import Image from "next/image";
import Link from "next/link";
import Carousel from "@/components/site/Carousel";
import CopyLine from "@/components/site/CopyLine";
import GlowButton from "@/components/site/GlowButton";
import HeadlineBlock from "@/components/site/HeadlineBlock";
import Scenes from "@/components/site/Scenes";
import ScrollCue from "@/components/site/ScrollCue";
import MascotSlot from "@/components/site/MascotSlot";
import { Reveal, Words } from "@/components/site/Effects";
import { ExecuteArt, ReviewArt, ValidateArt } from "@/components/site/StepArt";
import { CSV_LIMITS } from "@/lib/csv/parse";
import { executionMode } from "@/lib/config";

const STATEMENTS = [
  { head: "Upload one CSV. Not thirty transfers.", body: "name x address x amount x reference", badges: ["CSV", "Template", "Header aliases"], art: "obj-csv" },
  { head: "Every row checked. Nothing dropped.", body: "checksum x exact decimals x duplicates x asset", badges: ["Validate", "Fix in place"], art: "obj-check" },
  { head: "One route per recipient. Fees shown.", body: "quote x estimate x readiness", badges: ["Route", "Fee estimate"], art: "obj-route" },
  { head: "Approval bound to the exact set.", body: "hash of recipients x second person x void on edit", badges: ["Four eyes", "Hash-bound"], art: "obj-stamp" },
  { head: "Executed one at a time. Tracked one at a time.", body: "idempotency key x bounded retries x no resend through unknown", badges: ["Queue", "Retries"], art: "obj-split" },
  { head: "Reconciled, exported, audited.", body: "references x fees x timestamps x simulated flag", badges: ["Reconcile", "Export", "Audit"], art: "obj-audit" },
];

const FEATURE_ART: Record<string, string> = { csv: "obj-csv", check: "obj-check", route: "obj-route", stamp: "obj-stamp", monitor: "obj-monitor", split: "obj-split", reconcile: "obj-scale", audit: "obj-audit" };
const STACK_ART = ["obj-chain", "obj-coin", "obj-vault"];

const FEATURES: Array<{ icon: "csv" | "check" | "route" | "stamp" | "monitor" | "split" | "reconcile" | "audit"; title: string; body: string }> = [
  { icon: "csv", title: "CSV payroll imports", body: "Template download, header aliases, files up to 10,000 rows parsed off the main thread so the page never freezes." },
  { icon: "check", title: "Row-level validation", body: "Checksum-aware address checks, exact decimal amounts, duplicate and asset detection, with a reason on every invalid row." },
  { icon: "route", title: "One route per payout", body: "Every recipient gets a route, a quote, its attempts and a provider reference you can inspect and copy." },
  { icon: "stamp", title: "Hash-bound approvals", body: "Approvals bind to a hash of the recipient set, record who and when, and are invalidated by any later change." },
  { icon: "monitor", title: "Execution monitoring", body: "Live progress, per-payment timelines and an activity feed of every state change, retry and failure." },
  { icon: "split", title: "Partial failures", body: "Completed payments stay completed. Failed ones are classified as retryable or final, with the provider's reason." },
  { icon: "reconcile", title: "Reconciliation", body: "Search, filter, mark matched or exception, and export a CSV with a simulated flag on every demo row." },
  { icon: "audit", title: "Audit trail", body: "Original CSV, approvals, funding, attempts, downloads and exports are recorded with actor and time. Append-only." },
];

const STACK: Array<[string, string]> = [
  ["Relay", "The routing layer in real mode. Each payout is quoted through Relay's public API and signed by your wallet. Relay sees every route; its request feed is public. That is documented, not hidden."],
  ["USDC on Base", "The default asset and network. Same-chain routes are plain transfers with no external privacy benefit, which the review screen tells you before you approve."],
  ["Your treasury wallet", "Funds never leave your control before you sign. The server holds no private key; it prepares steps, records hashes and polls status."],
];

const LIMITS: Array<[string, string]> = [
  ["Rows per CSV", CSV_LIMITS.maxRows.toLocaleString()],
  ["File size", `${CSV_LIMITS.maxBytes / 1024 / 1024} MB`],
  ["Route quotes", "50 / min on the public Relay API"],
  ["Retries", "bounded per organisation, default 3"],
  ["Submission spacing", "0 to 30 minutes, off by default"],
  ["Roles", "owner · finance · approver · viewer"],
];

const CSV_HEADER = "name,address,amount,asset,reference";

function Cross({ className = "" }: { className?: string }) {
  return <span className={`n-cross ${className}`} aria-hidden="true" />;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="n-badge">
      <span className="n-badge-dot">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}

export default function HomePage() {
  const mode = executionMode();

  return (
    <>
      <ScrollCue />

      {/* ───────── Hero: statement left, artwork right ───────── */}
      <section className="n-spot relative flex min-h-[100vh] w-full flex-col justify-center overflow-hidden px-4 pb-28 pt-32 md:px-16 lg:px-[8vw]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex max-w-[720px] flex-col gap-y-6">
            <p className="flex flex-wrap gap-x-6 gap-y-2">
              <Badge>EVM chains via Relay</Badge>
              <Badge>USDC · USDT · ETH</Badge>
            </p>
            <h1 className="n-lead text-white">
              <Words text="Don’t re-key thirty transfers." />
              <br />
              <Words text="Control one batch." delay={320} className="n-shimmer" />
            </h1>
            <p className="n-mono-line">validate x route x approve x execute x reconcile</p>
            <p className="n-body max-w-[560px]">Sheaf lets finance teams prepare, approve, coordinate and reconcile many digital-asset payouts from one place. Every recipient is validated, routed, tracked and reconciled on its own. Private externally, transparent internally.</p>
            <div className="flex flex-row flex-wrap items-center gap-5">
              <GlowButton href="/sign-up" className="n-magnet">Open app</GlowButton>
              <GlowButton href="/#how-it-works" ghost className="n-magnet">
                How it works
              </GlowButton>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[560px]">
            <Cross className="absolute -left-6 -top-6" />
            <Cross className="absolute -right-6 -top-6" />
            <Cross className="absolute -bottom-6 -left-6" />
            <Cross className="absolute -bottom-6 -right-6" />
            <div className="relative aspect-square">
              <span className="n-orbit" aria-hidden="true" />
              <span className="n-orbit n-orbit-2" aria-hidden="true" />
              <span className="absolute inset-[12%] rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,46,85,.45),rgba(104,82,253,.2)_55%,transparent_75%)] blur-2xl" aria-hidden="true" />
              <MascotSlot />
            </div>
          </div>
        </div>
        {/* marquee at the bottom of the hero */}
        <div className="n-marquee absolute inset-x-0 bottom-16 md:bottom-12" aria-hidden="true">
          <div className="n-marquee-track n-label text-white/70">
            {[0, 1].map((k) => (
              <span key={k} className="flex gap-12">
                {["Base · Arbitrum · Optimism · Ethereum", "Roles: owner · finance · approver · viewer", "Exact decimals, no floats", "Idempotent execution", "Append-only audit trail", mode === "demo" ? "Demo mode: simulated" : "Real mode"].map((t) => (
                  <span key={t} className="flex items-center gap-12">
                    {t} <span className="h-1.5 w-1.5 rounded-full bg-[var(--n-accent)]" />
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Black statement band ───────── */}
      <section className="n-band px-6 py-16 md:py-20">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8">
          <span className="n-cross-col shrink-0" aria-hidden="true">
            <Cross />
            <Cross />
            <Cross />
          </span>
          <Reveal as="p" className="max-w-[720px] text-center text-[15px] leading-relaxed text-white md:text-base">Most payout tools ask you to trust a button. Sheaf asks for a CSV, shows you every row, every route and every fee, waits for a second person to approve the exact set, and then executes one payment at a time with a record of everything.</Reveal>
          <span className="n-cross-col shrink-0" aria-hidden="true">
            <Cross />
            <Cross />
            <Cross />
          </span>
        </div>
      </section>

      {/* ───────── Three steps, alternating ───────── */}
      <section id="how-it-works" className="scroll-mt-24 flex flex-col gap-y-24 px-4 py-20 md:px-20 lg:mx-auto lg:max-w-[1400px] lg:px-[120px]">
        {[
          { h: ["Upload a CSV", "Any row, any size"], p: "Drop the contractor CSV. It is parsed in a background thread and every row is checked for a valid checksummed address, an exact amount, duplicates and the right asset. Invalid rows are kept, explained and fixable in place, and the batch only moves on when every row is valid.", cta: ["/docs#csv", "Read the CSV format"], badges: ["Template", "Aliases", "10,000 rows"], art: <ValidateArt />, flip: false },
          { h: ["Route and review", "Approve the exact set"], p: "One route and one fee quote per recipient, labelled as estimates. The review screen lists totals, funding requirement, route readiness and unresolved warnings. An approver who did not edit the rows signs off on a hash of the exact recipient set. Change a row and the approval is void.", cta: ["/docs#roles", "Roles and approvals"], badges: ["Fee estimate", "Four eyes", "Hash-bound"], art: <ReviewArt />, flip: true },
          { h: ["Execute", "One payment at a time"], p: "Funding is confirmed, then each payment becomes its own job with an idempotency key. Failures are isolated and classified; retries are explicit and never sent while a previous attempt is pending or unknown. Results land in reconciliation with references, fees and an export.", cta: ["/docs#execution", "Execution and retries"], badges: ["Idempotent", "Retries", "Export"], art: <ExecuteArt />, flip: false },
        ].map((row) => (
          <div key={row.h[0]} className="flex w-full flex-col-reverse gap-y-8 md:flex-row md:items-center md:gap-x-[4vw]">
            <Reveal className={`z-[1] flex flex-1 shrink-0 flex-col gap-y-7 ${row.flip ? "md:order-2" : ""}`}>
              <h2 className="n-h2 text-center md:text-left">
                {row.h[0]}
                <br />
                <span className="text-[var(--n-accent)]">{row.h[1]}</span>
              </h2>
              <p className="n-body text-center md:max-w-[560px] md:text-left">{row.p}</p>
              <div className="flex justify-center md:justify-start">
                <GlowButton href={row.cta[0]} small>
                  {row.cta[1]}
                </GlowButton>
              </div>
              <p className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:justify-start">
                {row.badges.map((b) => (
                  <Badge key={b}>{b}</Badge>
                ))}
              </p>
            </Reveal>
            <div className={`n-tilt relative w-full flex-1 ${row.flip ? "md:order-1" : ""}`} data-parallax="0.08">
              <Cross className="absolute -left-5 -top-5" />
              <Cross className="absolute -right-5 -top-5" />
              <Cross className="absolute -bottom-5 -left-5" />
              <Cross className="absolute -bottom-5 -right-5" />
              {row.art}
            </div>
          </div>
        ))}
      </section>

      {/* ───────── Six statements on the violet stage ───────── */}
      <Scenes items={STATEMENTS} />

      {/* ───────── Features intro + carousel ───────── */}
      <HeadlineBlock
        id="features"
        title={
          <>
            What&rsquo;s under the <em>hood</em>
          </>
        }
      >
        Eight things Sheaf does on purpose: CSV imports, row-level validation, one route per payout, hash-bound approvals, execution monitoring, partial-failure handling, reconciliation with exports, and an append-only audit trail.
      </HeadlineBlock>
      <section className="relative w-full px-0 md:px-8">
        <div className="mx-auto w-full md:max-w-[calc(90vw-6rem)] lg:max-w-[calc(90vw-12rem)]">
          <Carousel label="Features">
            {FEATURES.map((f) => (
              <Link key={f.title} href="/app" className="n-glow n-feat n-tilt group">
                <h3 className="n-h3 min-h-[3.3em]">{f.title}</h3>
                <div className="flex w-full justify-between px-2">
                  <Cross />
                  <Cross />
                </div>
                <span className="relative flex h-[190px] w-[190px] items-center justify-center" aria-hidden="true">
                  <span className="absolute inset-4 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(255,46,85,.35),transparent_70%)] blur-xl" />
                  <Image src={`/art/3d/${FEATURE_ART[f.icon]}.webp`} alt="" width={900} height={900} sizes="190px" className="relative w-full transition-transform duration-500 group-hover:scale-105" />
                </span>
                <div className="flex w-full justify-between px-2">
                  <Cross />
                  <Cross />
                </div>
                <p className="max-w-[300px] text-[14px] leading-relaxed text-white/85">{f.body}</p>
                <span className="n-bracket mt-auto w-full group-hover:bg-white/5">Open app</span>
              </Link>
            ))}
          </Carousel>
        </div>
      </section>

      {/* ───────── Image band + who / mission / rails ───────── */}
      <section className="relative mt-24 h-[62vh] min-h-[440px] w-full overflow-hidden bg-black" aria-label="Visual identity">
        <Image src="/art/3d/band.webp" alt="The Sheaf courier on a podium, surrounded by floating blank cards." fill sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,22,.15),rgba(10,8,22,0)_35%,rgba(10,8,22,.9))]" />
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 n-label text-white/85">Private externally · transparent internally</p>
      </section>
      <HeadlineBlock
        title={
          <>
            Who it&rsquo;s for: <em>finance teams that pay people.</em>
          </>
        }
      >
        Operators who re-key spreadsheets into wallets, approvers who sign off on a total they cannot inspect, and auditors who rebuild the story from transaction hashes. Sheaf keeps the work in one place, in stages, with every step recorded.
      </HeadlineBlock>
      <HeadlineBlock
        title={
          <>
            Our position: <em>honest privacy.</em>
          </>
        }
      >
        Sheaf reduces unnecessary public linkage between treasury operations and individual payouts, within the limits of the underlying payment rails. It does not make payments anonymous, and it never hides anything from your own finance team. The{" "}
        <Link href="/security" className="n-link">
          threat model
        </Link>{" "}
        says exactly what is and is not implemented.
      </HeadlineBlock>
      <HeadlineBlock
        title={
          <>
            Settling on <em>open rails.</em>
          </>
        }
      >
        Routes are quoted from Relay&rsquo;s public API and settled on EVM networks such as Base. Cross-chain routes are filled by a provider address rather than your treasury; same-chain routes are plain transfers. Both are labelled on the review screen, and the execution engine treats every provider answer as a state, never as a promise.
      </HeadlineBlock>

      {/* ───────── The stack ───────── */}
      <HeadlineBlock
        id="stack"
        className="!pb-10"
        title={
          <>
            The <em>stack:</em>
          </>
        }
      />
      <section className="relative">
        <Carousel label="The stack" className="overflow-hidden">
          {STACK.map(([label, text], i) => (
            <div key={label} className="n-stack">
              <p className="n-label flex items-center gap-2">
                <span className="h-2 w-2 bg-white" aria-hidden="true" /> [ {label} ]
              </p>
              <div className="relative mx-auto flex h-[220px] w-[220px] items-center justify-center">
                <Cross className="absolute -left-4 -top-4" />
                <Cross className="absolute -right-4 -top-4" />
                <Cross className="absolute -bottom-4 -left-4" />
                <Cross className="absolute -bottom-4 -right-4" />
                <Image src={`/art/3d/${STACK_ART[i]}.webp`} alt="" width={900} height={900} sizes="220px" className="w-full drop-shadow-[0_20px_40px_rgba(0,0,0,.35)]" />
              </div>
              <p className="flex items-start gap-x-4 text-[15px] leading-relaxed text-white/95 lg:text-base">
                <Cross className="mt-1 shrink-0" />
                {text}
              </p>
            </div>
          ))}
        </Carousel>
      </section>

      {/* ───────── Bring your CSV ───────── */}
      <section id="csv" className="scroll-mt-24 px-4 py-24 md:px-16 lg:px-[8vw]">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-y-6">
            <h2 className="n-h2">
              Bring your CSV
              <br />
              <span className="text-[var(--n-accent)]">One header, five columns</span>
            </h2>
            <p className="n-body max-w-[560px]">Name, wallet address, amount, asset and an optional internal reference. Header aliases such as &ldquo;wallet&rdquo; or &ldquo;amt&rdquo; are recognised, amounts are parsed as exact decimals, and the template already carries the right columns.</p>
            <p className="n-mono-line break-all rounded-[14px] border border-white/15 bg-black/40 px-4 py-3 text-white">{CSV_HEADER}</p>
            <div className="flex flex-wrap items-center gap-5">
              <CopyLine text={CSV_HEADER} />
              <GlowButton href="/api/template" ghost>
                Download the template
              </GlowButton>
            </div>
          </div>
          <div className="n-panel rounded-[20px] p-6 md:p-8">
            <p className="n-label mb-5 text-[var(--n-lilac)]">Public limits</p>
            <ul className="divide-y divide-white/10">
              {LIMITS.map(([k, v]) => (
                <li key={k} className="flex items-baseline justify-between gap-6 py-3 text-[15px]">
                  <span className="text-white/70">{k}</span>
                  <span className="text-right font-mono text-white">{v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[13px] text-white/55">
              Everything above is enforced on the server and documented in the{" "}
              <Link href="/docs#limitations" className="n-link">
                docs
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ───────── Summary box + closing ───────── */}
      <section className="px-4 pb-28">
        <div className="mx-auto max-w-[1100px] overflow-hidden rounded-[24px] border border-white/15 bg-[linear-gradient(120deg,rgba(104,82,253,.35),rgba(255,46,85,.2))] p-8 text-center md:p-14">
          <p className="n-label mb-4 text-[var(--n-lilac)]">In one line</p>
          <h2 className="n-h2 mx-auto max-w-[22ch]">
            Validate, route, approve, execute, reconcile. <em>Every payout on its own.</em>
          </h2>
          <p className="n-body mx-auto mt-6 max-w-[620px] text-white/80">Sign in to the demo workspace with seeded batches at every stage, or create your own organisation. {mode === "demo" ? "No funds move in demo mode; every record is labelled simulated." : ""}</p>
          <div className="mt-10 flex flex-wrap justify-center gap-5">
            <GlowButton href="/sign-in">Open the demo workspace</GlowButton>
            <GlowButton href="/docs" ghost>
              Read the docs
            </GlowButton>
          </div>
        </div>
      </section>
    </>
  );
}
