import Link from "next/link";
import { DemoBadge, KindTag, Money, PhaseBadge } from "@/components/ui";
import type { BriefSummary } from "@/lib/briefs";
import { categoryLabel } from "@/lib/domain";
import { plural, timeLeft } from "@/lib/format";

/** One brief in the discovery grid. The title link covers the whole card; nothing else inside is interactive. */
export default function BriefCard({ brief, now }: { brief: BriefSummary; now: Date }) {
  const left = timeLeft(brief.closesAt, now);
  const noPrize = BigInt(brief.prize) === 0n;
  return (
    <article className="card relative flex h-full flex-col p-5 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lift focus-within:shadow-lift">
      <div className="flex flex-wrap items-center gap-2">
        <KindTag kind={brief.kind} />
        <PhaseBadge phase={brief.phase} />
        {brief.isDemo && <DemoBadge />}
      </div>
      <h3 className="mt-4 font-display text-[1.375rem] font-medium leading-snug tracking-[-0.01em] text-ink">
        <Link href={`/briefs/${brief.id}`} className="decoration-ink/30 underline-offset-4 after:absolute after:inset-0 after:rounded-lg hover:underline">
          {brief.title}
        </Link>
      </h3>
      <p className="mt-2 text-sm text-ink-soft">
        {brief.sponsorName}
        <span className="text-ink-faint"> · {categoryLabel(brief.category)}</span>
      </p>
      <div className="mt-6 flex flex-1 items-end justify-between gap-4 border-t border-line pt-4">
        <div>
          <p className="t-eyebrow">Prize</p>
          {noPrize ? (
            <p className="mt-1 text-sm font-medium text-ink-soft">No prize · house brief</p>
          ) : (
            <p className="mt-1 font-display text-2xl font-medium text-ink">
              <Money units={brief.prize} currency={brief.currency} />
            </p>
          )}
        </div>
        <div className="text-right text-sm">
          <p className={left.over ? "text-ink-faint" : "font-medium text-moss-deep"}>{left.label}</p>
          <p className="t-num mt-0.5 text-ink-faint">
            {plural(brief.entryCount, "entry", "entries")} · {plural(brief.agentCount, "agent")}
          </p>
        </div>
      </div>
    </article>
  );
}
