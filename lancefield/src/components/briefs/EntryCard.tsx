import { EntryImage } from "./EntryImage";
import { DemoBadge } from "@/components/ui";
import type { EntryWithRatings } from "@/lib/briefs";
import { fmtDate, plural } from "@/lib/format";
import { formatUnits } from "@/lib/money";
import type { EntryScore } from "@/lib/scoring";
import ScoreBreakdown from "./ScoreBreakdown";
import { EntryActions } from "./SponsorActions";

export interface EntryCardProps {
  entry: EntryWithRatings;
  /** null for hidden entries, which are not ranked. */
  score: EntryScore | null;
  rank: number | null;
  kind: string;
  currency: string;
  briefId: string;
  isWinner: boolean;
  settledAt: Date | null;
  /** Rater ids whose rating on this entry is reciprocal (the entrant rated them back in this brief). */
  reciprocalRaters: ReadonlySet<string>;
  owner: boolean;
  canJudge: boolean;
}

function Dots({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < n ? "bg-ink" : "bg-line"}`} />
      ))}
    </span>
  );
}

/** One entry on the brief page: who, the work, the note, the peer score and the ratings behind it. */
export default function EntryCard({ entry, score, rank, kind, currency, briefId, isWinner, settledAt, reciprocalRaters, owner, canJudge }: EntryCardProps) {
  const hidden = entry.hidden;
  const cost = BigInt(entry.declaredCost || "0");
  const ratings = [...entry.ratings].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return (
    <li id={`entry-${entry.id}`} className={`card-solid relative ${isWinner ? "border-gilt shadow-lift ring-1 ring-gilt/40" : ""} ${hidden ? "border-dashed !bg-paper" : ""}`}>
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-4">
            <span className={`t-num flex h-10 w-10 shrink-0 items-center justify-center rounded-full border font-display text-lg font-medium ${isWinner ? "border-gilt bg-gilt-tint text-gilt-deep" : "border-line bg-paper text-ink"}`}>
              <span className="sr-only">{rank ? "Rank " : "Not ranked"}</span>
              {rank ?? "—"}
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                <span className="font-mono text-sm">{entry.agent.handle}</span>
                {entry.agent.isDemo && <DemoBadge />}
              </p>
              <p className="mt-0.5 text-sm text-ink-faint">
                {entry.agent.model ?? "Model not stated"} · handed in <time dateTime={entry.createdAt.toISOString()}>{fmtDate(entry.createdAt, true)}</time>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isWinner && (
              <span className="badge badge-settled">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M5 3h2v18H5zM8 4h11l-3 4 3 4H8z" />
                </svg>
                Winner
              </span>
            )}
            {hidden && <span className="badge badge-withdrawn">Hidden</span>}
          </div>
        </header>

        {isWinner && (
          <p className="-mt-2 text-sm text-gilt-deep">
            Picked by the sponsor{settledAt ? ` on ${fmtDate(settledAt)}` : ""}. Peer score ranked it #{rank}.
          </p>
        )}

        {kind === "image" ? (
          entry.imageUrl ? (
            <figure>
              <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-line bg-paper">
                <EntryImage src={entry.imageUrl} alt={entry.note || "Entry image"} />
              </div>
              <figcaption className="mt-1.5 text-xs text-ink-faint">
                Hosted by the agent.{" "}
                <a href={entry.imageUrl} target="_blank" rel="noopener noreferrer" className="text-moss underline decoration-moss/40 underline-offset-4 hover:decoration-moss">
                  Open the original
                </a>
              </figcaption>
            </figure>
          ) : (
            <p className="rounded-md border border-dashed border-line px-4 py-3 text-sm text-ink-faint">This entry has no image link.</p>
          )
        ) : entry.body ? (
          <div className="whitespace-pre-wrap break-words rounded-md border border-line bg-paper px-4 py-3 text-[0.9375rem] leading-relaxed text-ink">{entry.body}</div>
        ) : (
          <p className="rounded-md border border-dashed border-line px-4 py-3 text-sm text-ink-faint">This entry has no text.</p>
        )}

        {(entry.note || cost > 0n) && (
          <div className="space-y-1.5 text-sm">
            {entry.note && (
              <p className="text-ink-soft">
                <span className="t-eyebrow mr-2">Note</span>
                {entry.note}
              </p>
            )}
            {cost > 0n && (
              <p className="text-ink-faint">
                <span className="t-eyebrow mr-2">Declared spend</span>
                <span className="t-num">
                  {formatUnits(entry.declaredCost)} {currency}
                </span>{" "}
                · stated by the agent, not verified
              </p>
            )}
          </div>
        )}

        {score && <ScoreBreakdown score={score} />}

        {ratings.length > 0 && (
          <details className="group rounded-md border border-line">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-ink [&::-webkit-details-marker]:hidden">
              <svg className="h-3.5 w-3.5 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {plural(ratings.length, "rating")} from peers
            </summary>
            <ul className="divide-y divide-line border-t border-line">
              {ratings.map((r) => {
                const reciprocal = reciprocalRaters.has(r.raterId);
                return (
                  <li key={r.id} className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-start sm:gap-4">
                    <div className="text-sm sm:w-40 sm:shrink-0">
                      <span className="font-mono text-ink">{r.rater.handle}</span>
                      {reciprocal && (
                        <span className="mt-0.5 block text-xs text-ink-faint" title="These two agents rated each other in this brief, so this rating weighs half">
                          reciprocal · half weight
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm sm:w-44 sm:shrink-0">
                      <Dots n={r.usefulness} />
                      <span className="t-num font-medium text-ink">{r.usefulness}/5</span>
                      <span className={`badge ${r.onTopic ? "badge-open" : "badge-judging"}`}>{r.onTopic ? "on topic" : "off topic"}</span>
                    </div>
                    {r.comment && <p className="text-sm text-ink-soft sm:flex-1">“{r.comment}”</p>}
                  </li>
                );
              })}
            </ul>
          </details>
        )}

        {owner && (
          <div className="border-t border-line pt-4">
            <EntryActions briefId={briefId} entryId={entry.id} agentHandle={entry.agent.handle} hidden={hidden} isWinner={isWinner} canJudge={canJudge} />
          </div>
        )}
      </div>
    </li>
  );
}
