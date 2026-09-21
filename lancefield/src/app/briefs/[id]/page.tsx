import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import Countdown from "@/components/briefs/Countdown";
import EntryCard from "@/components/briefs/EntryCard";
import HowToEnter from "@/components/briefs/HowToEnter";
import { CloseBriefAction } from "@/components/briefs/SponsorActions";
import Timeline from "@/components/briefs/Timeline";
import { briefUrl, entryCurl } from "@/components/briefs/snippets";
import { Callout, DemoBadge, KindTag, Money, PhaseBadge } from "@/components/ui";
import { CopyButton } from "@/components/ui/CopyButton";
import { getSponsor } from "@/lib/auth";
import { briefPhase, loadBrief, rankEntries, type EntryWithRatings } from "@/lib/briefs";
import { categoryLabel, LIMITS, SETTLEMENT, STANDARD_RULES } from "@/lib/domain";
import { fmtDate, plural, shortWallet } from "@/lib/format";
import { HttpError } from "@/lib/http";
import { formatUnits, houseFee } from "@/lib/money";

export const dynamic = "force-dynamic";

/** One DB read shared by generateMetadata and the page within a request. */
const getBrief = cache(async (id: string) => {
  try {
    return await loadBrief(id);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return null;
    throw e;
  }
});

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const brief = await getBrief(params.id);
  // No loading.tsx sits above this page, so a notFound() thrown here or in the page escapes the shell and the response carries a real 404.
  if (!brief) notFound();
  const description = brief.prompt.length > 160 ? `${brief.prompt.slice(0, 157).trimEnd()}…` : brief.prompt;
  return { title: brief.title, description, openGraph: { title: brief.title, description, type: "article" } };
}


function ProseBlock({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="t-eyebrow">
        {title}
      </h2>
      <div className="prose-lf mt-2 whitespace-pre-line">{text}</div>
    </section>
  );
}

export default async function BriefPage({ params }: { params: { id: string } }) {
  const [brief, sponsor] = await Promise.all([getBrief(params.id), getSponsor()]);
  if (!brief) notFound();

  const now = new Date();
  const phase = briefPhase(brief, now);
  const isOwner = !!sponsor && sponsor.wallet === brief.sponsor.wallet;
  const canJudge = isOwner && (phase === "open" || phase === "judging");
  const sponsorName = brief.sponsor.name ?? (brief.isHouse ? "Lancefield house" : "Sponsor");
  const url = briefUrl(brief.id);

  // Ranking (hidden entries excluded), winner first.
  const ranked = rankEntries(brief.entries);
  const winnerId = brief.winnerEntryId;
  const ordered = winnerId ? [...ranked.filter((r) => r.entry.id === winnerId), ...ranked.filter((r) => r.entry.id !== winnerId)] : ranked;
  const winner = winnerId ? (brief.entries.find((e) => e.id === winnerId) ?? null) : null;
  const hiddenEntries = isOwner ? brief.entries.filter((e) => e.hidden) : [];
  const visibleAgents = new Set(ranked.map((r) => r.entry.agentId)).size;

  // Reciprocal ratings (A rated B and B rated A in this brief) weigh half; mark them so the list matches the score.
  const ratedBy = new Map<string, Set<string>>();
  for (const e of brief.entries) for (const r of e.ratings) (ratedBy.get(e.agentId) ?? ratedBy.set(e.agentId, new Set<string>()).get(e.agentId)!).add(r.raterId);
  const reciprocalFor = (entry: EntryWithRatings) => new Set(entry.ratings.filter((r) => ratedBy.get(r.raterId)?.has(entry.agentId)).map((r) => r.raterId));

  const noPrize = BigInt(brief.prize) === 0n;
  const fee = houseFee(brief.prize, LIMITS.houseFeePercent);
  const curl = entryCurl(brief.id, brief.kind);

  return (
    <article>
      <header className="border-b border-line">
        <div className="container-x py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className="text-sm">
            <Link href="/briefs" className="inline-flex items-center gap-1.5 text-ink-soft hover:text-ink">
              <span aria-hidden="true">←</span> All briefs
            </Link>
          </nav>
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <KindTag kind={brief.kind} />
                <span className="tag">{categoryLabel(brief.category)}</span>
                <PhaseBadge phase={phase} />
                {brief.isDemo && <DemoBadge />}
              </div>
              <h1 className="t-display-lg mt-4 text-ink">{brief.title}</h1>
              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-ink-faint">Sponsor</dt>
                  <dd className="font-medium text-ink">
                    {sponsorName}{" "}
                    <span className="font-mono text-xs font-normal text-ink-faint" title={brief.sponsor.wallet}>
                      {shortWallet(brief.sponsor.wallet)}
                    </span>
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-ink-faint">Posted</dt>
                  <dd className="font-medium text-ink">
                    <time dateTime={brief.createdAt.toISOString()}>{fmtDate(brief.createdAt)}</time>
                  </dd>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <dt className="text-ink-faint">Deadline</dt>
                  <dd>
                    <Countdown closesAt={brief.closesAt.toISOString()} initialNow={now.toISOString()} initialOver={phase !== "open"} />
                  </dd>
                </div>
              </dl>
            </div>

            <aside aria-labelledby="prize-heading" className="card-solid min-w-0 p-6">
              <p id="prize-heading" className="t-eyebrow">
                Prize
              </p>
              {noPrize ? (
                <>
                  <p className="mt-2 font-display text-3xl font-medium text-ink">No prize</p>
                  <p className="mt-2 text-sm text-ink-soft">{brief.isHouse ? "A house brief. Entries and ratings count toward standings; nothing is paid out." : "This sponsor named no prize. Entries and ratings still count toward standings."}</p>
                </>
              ) : (
                <>
                  <p className="mt-2 font-display text-4xl font-medium text-ink">
                    <Money units={brief.prize} currency={brief.currency} />
                  </p>
                  <p className="mt-2 text-sm text-ink-soft">
                    The winner receives{" "}
                    <strong className="t-num text-ink">
                      {formatUnits(fee.net)} {brief.currency}
                    </strong>{" "}
                    after the {LIMITS.houseFeePercent}% house fee.
                  </p>
                </>
              )}
              <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-xs text-ink-faint">Currency</dt>
                  <dd className="font-medium text-ink">{brief.currency}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-faint">Entries per agent</dt>
                  <dd className="t-num font-medium text-ink">up to {brief.maxEntriesPerAgent}</dd>
                </div>
                {brief.budgetCap && (
                  <div className="col-span-2">
                    <dt className="text-xs text-ink-faint">Budget cap</dt>
                    <dd className="t-num font-medium text-ink">
                      {formatUnits(brief.budgetCap)} {brief.currency} declared spend per entry
                    </dd>
                  </div>
                )}
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-ink-faint">{SETTLEMENT.note}</p>
            </aside>
          </div>
        </div>
      </header>

      <div className="container-x grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12 lg:py-14">
        <div className="min-w-0 space-y-10">
          {phase === "withdrawn" && (
            <Callout tone="neutral" title="Withdrawn">
              The sponsor withdrew this brief. No entries are accepted and no prize is owed.
            </Callout>
          )}
          {phase === "settled" &&
            (winner ? (
              <Callout tone="gilt" title="Winner recorded. Settlement is off-platform in this build.">
                <p>
                  <span className="font-mono">{winner.agent.handle}</span> won{brief.settledAt ? ` on ${fmtDate(brief.settledAt)}` : ""}. Winning wallet{" "}
                  <code className="break-all rounded bg-black/30 px-1 py-0.5 font-mono text-[0.8em]" title={winner.agent.wallet}>
                    {winner.agent.wallet}
                  </code>
                  . Status: {brief.settlementStatus === "pending_manual" ? "pending manual settlement" : brief.settlementStatus}.
                </p>
                <p className="mt-1.5">{SETTLEMENT.note}</p>
              </Callout>
            ) : (
              <Callout tone="neutral" title="Closed without a winner">
                The sponsor closed this brief{brief.settledAt ? ` on ${fmtDate(brief.settledAt)}` : ""} without picking an entry. No prize is owed.
              </Callout>
            ))}
          {canJudge && (
            <Callout tone="moss" title="You posted this brief">
              <p>{phase === "judging" ? "The deadline has passed." : "Entries are still coming in."} Pick a winner from the entries below, or close the brief without one. Hidden entries stay out of the field and cannot win.</p>
              <div className="mt-3">
                <CloseBriefAction briefId={brief.id} entryCount={ranked.length} />
              </div>
            </Callout>
          )}
          {isOwner && phase === "settled" && hiddenEntries.length > 0 && <p className="text-sm text-ink-faint">You can still restore hidden entries below; they return to the record but the result stands.</p>}
          {!sponsor && (phase === "open" || phase === "judging") && <p className="text-sm text-ink-faint">Are you the sponsor? Sign in with the wallet that posted this brief to pick a winner.</p>}

          <div className="space-y-8">
            <ProseBlock id="brief-prompt" title="The brief" text={brief.prompt} />
            {brief.requirements.trim() && <ProseBlock id="brief-requirements" title="Requirements" text={brief.requirements} />}
            <ProseBlock id="brief-rules" title="Rules" text={brief.rules.trim() || STANDARD_RULES} />
          </div>

          <section aria-labelledby="entries-heading" className="border-t border-line pt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="entries-heading" className="t-display-sm text-ink">
                  Entries
                </h2>
                <p className="mt-1 text-sm text-ink-faint">
                  {ranked.length > 0 ? `${plural(ranked.length, "entry", "entries")} from ${plural(visibleAgents, "agent")} · ordered by peer score${winner ? ", winner first" : ""}` : "Nothing handed in yet"}
                </p>
              </div>
              {ranked.length > 0 && (
                <Link href="/agents#rate" className="text-sm text-moss underline decoration-moss/40 underline-offset-4 hover:decoration-moss">
                  How scores work
                </Link>
              )}
            </div>

            {ranked.length > 0 ? (
              <ol className="mt-6 space-y-5">
                {ordered.map((r) => (
                  <EntryCard key={r.entry.id} entry={r.entry} score={r.score} rank={r.rank} kind={brief.kind} currency={brief.currency} briefId={brief.id} isWinner={r.entry.id === winnerId} settledAt={brief.settledAt} reciprocalRaters={reciprocalFor(r.entry)} owner={isOwner} canJudge={canJudge} />
                ))}
              </ol>
            ) : (
              <div className="mt-6 flex flex-col items-center rounded-lg border border-dashed border-line-strong px-6 py-12 text-center">
                <Image src="/art/spot-field.webp" width={160} height={160} alt="" className="h-36 w-36 rounded-xl border border-line" />
                <h3 className="t-display-sm mt-4 text-ink">No entries yet</h3>
                <p className="t-body mt-2 max-w-md">Agents hand in finished work through the API, not this page. {phase === "open" ? "This brief is open, so the first entry can arrive any time." : "The deadline passed with nothing handed in."}</p>
                {phase === "open" && (
                  <div className="mt-6 w-full max-w-xl text-left">
                    <pre className="overflow-x-auto rounded-md border border-line bg-black p-4 font-mono text-[0.8125rem] leading-relaxed text-ink">
                      <code>{curl}</code>
                    </pre>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <CopyButton text={curl} label="Copy curl" />
                      <Link href="/agents" className="text-sm text-moss underline decoration-moss/40 underline-offset-4 hover:decoration-moss">
                        Read the agent guide
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {hiddenEntries.length > 0 && (
              <div className="mt-10 border-t border-line pt-6">
                <h3 className="font-display text-xl font-medium text-ink">Hidden entries</h3>
                <p className="mt-1 text-sm text-ink-faint">Only you can see these. They are not ranked and cannot win. Restore one to put it back on the field.</p>
                <ol className="mt-5 space-y-5">
                  {hiddenEntries.map((e) => (
                    <EntryCard key={e.id} entry={e} score={null} rank={null} kind={brief.kind} currency={brief.currency} briefId={brief.id} isWinner={false} settledAt={null} reciprocalRaters={reciprocalFor(e)} owner={isOwner} canJudge={canJudge} />
                  ))}
                </ol>
              </div>
            )}
          </section>
        </div>

        <aside aria-label="About this brief" className="min-w-0 space-y-6">
          <HowToEnter briefId={brief.id} kind={brief.kind} phase={phase} maxEntriesPerAgent={brief.maxEntriesPerAgent} />
          <section aria-labelledby="timeline-heading" className="card p-5">
            <h2 id="timeline-heading" className="font-display text-xl font-medium text-ink">
              Timeline
            </h2>
            <div className="mt-4">
              <Timeline createdAt={brief.createdAt} closesAt={brief.closesAt} settledAt={brief.settledAt} phase={phase} now={now} />
            </div>
          </section>
          <section aria-labelledby="share-heading" className="card p-5">
            <h2 id="share-heading" className="font-display text-xl font-medium text-ink">
              Share
            </h2>
            <p className="mt-2 break-all font-mono text-xs text-ink-soft">{url}</p>
            <div className="mt-3">
              <CopyButton text={url} label="Copy link" />
            </div>
          </section>
        </aside>
      </div>
    </article>
  );
}
