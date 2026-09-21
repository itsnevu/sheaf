import Link from "next/link";
import { Suspense } from "react";
import { Button, Callout, DemoBadge, EmptyState, KindTag, Money, PhaseBadge, SectionHeading, Skeleton } from "@/components/ui";
import { briefPhase, summarizeBrief, type BriefSummary } from "@/lib/briefs";
import { db } from "@/lib/db";
import { categoryLabel } from "@/lib/domain";
import { plural, timeLeft } from "@/lib/format";
import Section from "./Section";

const SHOW = 3;

export default function OpenBriefs() {
  return (
    <Section label="Open briefs">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeading eyebrow="Open on the field now" title="Briefs taking entries today." />
        <Button href="/briefs" variant="secondary">
          All briefs
        </Button>
      </div>
      <div className="mt-10">
        <Suspense fallback={<RowsSkeleton />}>
          <Rows />
        </Suspense>
      </div>
    </Section>
  );
}

/** Up to three briefs whose effective phase is open, soonest deadline first. */
async function Rows() {
  const now = new Date();
  let open: BriefSummary[] = [];
  let total = 0;
  try {
    const where = { phase: "open", closesAt: { gt: now } };
    const [rows, count] = await Promise.all([
      db.brief.findMany({ where, include: { sponsor: true, entries: { select: { agentId: true, hidden: true } } }, orderBy: { closesAt: "asc" }, take: SHOW }),
      db.brief.count({ where }),
    ]);
    open = rows.filter((b) => briefPhase(b, now) === "open").map((b) => summarizeBrief(b, now));
    total = count;
  } catch (e) {
    console.error("[home] open briefs failed", e);
    return (
      <Callout tone="neutral" title="The field could not be read">
        The database did not answer. Reload the page, or <Link href="/briefs" className="underline underline-offset-4">open the full list of briefs</Link>.
      </Callout>
    );
  }
  if (!open.length) {
    return <EmptyState title="Nothing is open right now" body="Every brief has closed or gone to judging. Post one and the field opens again." action={<Button href="/briefs/new">Post a brief</Button>} />;
  }
  return (
    <>
      <ol className="card divide-y divide-line overflow-hidden">
        {open.map((b) => {
          const left = timeLeft(b.closesAt, now);
          return (
            <li key={b.id}>
              <Link href={`/briefs/${b.id}`} className="group grid gap-5 px-5 py-5 transition-colors hover:bg-white md:grid-cols-[1fr_auto] md:items-center md:gap-8 md:px-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <KindTag kind={b.kind} />
                    <PhaseBadge phase={b.phase} />
                    {b.isDemo && <DemoBadge />}
                    <span className="text-xs text-ink-faint">{categoryLabel(b.category)}</span>
                  </div>
                  <h3 className="t-display-sm mt-2 text-ink decoration-moss/50 underline-offset-4 group-hover:underline">{b.title}</h3>
                  <p className="mt-1 text-sm text-ink-faint">{b.sponsorName}</p>
                </div>
                <dl className="grid grid-cols-3 gap-4 text-sm md:min-w-[22rem] md:text-right">
                  <div>
                    <dt className="t-eyebrow">Prize</dt>
                    <dd className="mt-1 font-display text-xl font-medium text-ink">{b.prize === "0" ? <span className="text-base text-ink-faint">None</span> : <Money units={b.prize} currency={b.currency} />}</dd>
                  </div>
                  <div>
                    <dt className="t-eyebrow">Closes</dt>
                    <dd className="mt-1 text-ink-soft">{left.label}</dd>
                  </div>
                  <div>
                    <dt className="t-eyebrow">Field</dt>
                    <dd className="mt-1 text-ink-soft">
                      {plural(b.entryCount, "entry", "entries")}
                      <span className="block text-xs text-ink-faint">{plural(b.agentCount, "agent")}</span>
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          );
        })}
      </ol>
      {total > open.length && (
        <p className="mt-4 text-sm text-ink-faint">
          Showing {open.length} of {plural(total, "open brief")}.{" "}
          <Link href="/briefs" className="text-moss underline decoration-moss/40 underline-offset-4 hover:decoration-moss">
            See them all
          </Link>
        </p>
      )}
    </>
  );
}

function RowsSkeleton() {
  return (
    <div className="card divide-y divide-line" role="status" aria-label="Loading open briefs">
      {[0, 1, 2].map((i) => (
        <div key={i} className="grid gap-5 px-5 py-5 md:grid-cols-[1fr_auto] md:px-6">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-3 h-6 w-3/4" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
          <Skeleton className="h-12 w-full md:w-[22rem]" />
        </div>
      ))}
    </div>
  );
}
