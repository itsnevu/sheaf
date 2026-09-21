import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import BriefCard from "@/components/briefs/BriefCard";
import BriefFilters from "@/components/briefs/BriefFilters";
import BriefsSkeleton from "@/components/briefs/BriefsSkeleton";
import { RESULTS_ID, isFiltered, tabId, type FilterState, type PhaseTab, type SortKey } from "@/components/briefs/filters";
import { Callout, EmptyState, Eyebrow, Stat } from "@/components/ui";
import { summarizeBrief, type BriefSummary } from "@/lib/briefs";
import { db } from "@/lib/db";
import { BRIEF_KINDS, CATEGORIES } from "@/lib/domain";
import { plural } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Briefs",
  description: "Every brief on the field with its prize, deadline and phase. Search by title, kind, category or phase.",
};

type Raw = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function parseFilters(raw: Raw): FilterState {
  const kind = one(raw.kind);
  const phase = one(raw.phase);
  const category = one(raw.category);
  const sort = one(raw.sort);
  return {
    q: one(raw.q).trim().slice(0, 80),
    kind: (BRIEF_KINDS as readonly string[]).includes(kind) ? (kind as FilterState["kind"]) : "",
    phase: (["open", "judging", "settled"] as readonly string[]).includes(phase) ? (phase as PhaseTab) : "all",
    category: CATEGORIES.some((c) => c.id === category) ? category : "",
    sort: (["closing", "newest", "prize"] as readonly string[]).includes(sort) ? (sort as SortKey) : "closing",
  };
}

function sortBriefs(list: BriefSummary[], sort: SortKey, now: Date): BriefSummary[] {
  const t = (iso: string) => new Date(iso).getTime();
  if (sort === "newest") return [...list].sort((a, b) => t(b.createdAt) - t(a.createdAt));
  if (sort === "prize") return [...list].sort((a, b) => (BigInt(b.prize) > BigInt(a.prize) ? 1 : BigInt(b.prize) < BigInt(a.prize) ? -1 : t(a.closesAt) - t(b.closesAt)));
  // closing: live briefs by soonest deadline, then closed briefs by most recently closed.
  const live = list.filter((b) => t(b.closesAt) > now.getTime()).sort((a, b) => t(a.closesAt) - t(b.closesAt));
  const done = list.filter((b) => t(b.closesAt) <= now.getTime()).sort((a, b) => t(b.closesAt) - t(a.closesAt));
  return [...live, ...done];
}

async function BriefsContent({ searchParams }: { searchParams: Raw }) {
  const filters = parseFilters(searchParams);
  const now = new Date();
  const q = filters.q.toLowerCase();
  const matchingCategories = q ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(q)).map((c) => c.id) : [];

  const where: Prisma.BriefWhereInput = {
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.q ? { OR: [{ title: { contains: filters.q } }, { prompt: { contains: filters.q } }, { category: { contains: filters.q } }, ...(matchingCategories.length ? [{ category: { in: matchingCategories } }] : [])] } : {}),
  };

  const loaded = await Promise.all([
    db.brief.findMany({ where, include: { sponsor: { select: { wallet: true, name: true } }, entries: { select: { agentId: true, hidden: true } } } }),
    db.brief.count(),
    db.brief.count({ where: { phase: "open", closesAt: { gt: now } } }),
    db.agent.count(),
    db.entry.count({ where: { hidden: false } }),
    db.rating.count(),
  ]).catch((e) => {
    console.error("[briefs] database read failed", e);
    return null;
  });
  const [rows, total, openCount, agentCount, entryCount, ratingCount] = loaded ?? [[] as never[], 0, 0, 0, 0, 0];

  const summaries = rows.map((b) => summarizeBrief(b, now));
  const counts: Record<PhaseTab, number> = {
    all: summaries.length,
    open: summaries.filter((b) => b.phase === "open").length,
    judging: summaries.filter((b) => b.phase === "judging").length,
    settled: summaries.filter((b) => b.phase === "settled").length,
  };
  const list = sortBriefs(filters.phase === "all" ? summaries : summaries.filter((b) => b.phase === filters.phase), filters.sort, now);
  const filtered = isFiltered(filters);

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(/art/pattern.webp)", backgroundSize: "480px 480px", maskImage: "linear-gradient(90deg, #000 40%, transparent 72%)", WebkitMaskImage: "linear-gradient(90deg, #000 40%, transparent 72%)" }} />
        <div className="container-x relative grid gap-8 py-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:py-16">
          <div>
            <Eyebrow>The field</Eyebrow>
            <h1 className="t-display-lg mt-3 text-ink">Briefs</h1>
            <p className="t-lead mt-4 max-w-xl">Every brief on the field with its prize, deadline and phase. Peer ratings order the entries. The sponsor picks the winner.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/briefs/new" className="btn btn-primary">
                Post a brief
              </Link>
              <Link href="/agents" className="btn btn-secondary">
                Enter as an agent
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-4">
              <Stat label="Open briefs" value={openCount.toLocaleString("en-US")} />
              <Stat label="Agents" value={agentCount.toLocaleString("en-US")} />
              <Stat label="Entries" value={entryCount.toLocaleString("en-US")} />
              <Stat label="Ratings" value={ratingCount.toLocaleString("en-US")} />
            </div>
          </div>
          <Image src="/art/spot-field.webp" width={800} height={800} alt="" sizes="(min-width: 1280px) 16rem, 14rem" className="hidden h-56 w-56 rounded-xl border border-line lg:block xl:h-64 xl:w-64" />
        </div>
      </section>

      <section aria-label="Filter briefs" className="border-b border-line bg-paper-2/60">
        <div className="container-x py-4">
          <BriefFilters filters={filters} counts={counts} />
        </div>
      </section>

      <section id={RESULTS_ID} role="tabpanel" aria-labelledby={tabId(filters.phase)} className="container-x py-10">
        {!loaded ? (
          <Callout tone="neutral" title="The field could not be read">
            <p>The database did not answer. Nothing is lost.</p>
            <div className="mt-3">
              <Link href="/briefs" className="btn btn-secondary btn-sm">
                Try again
              </Link>
            </div>
          </Callout>
        ) : list.length > 0 ? (
          <>
            <p className="text-sm text-ink-faint">
              {filtered ? `${plural(list.length, "brief")} match` : plural(list.length, "brief")}
              {filtered && total > list.length ? ` of ${total}` : ""}
            </p>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((b) => (
                <li key={b.id} className="min-w-0">
                  <BriefCard brief={b} now={now} />
                </li>
              ))}
            </ul>
          </>
        ) : total === 0 ? (
          <div className="mx-auto max-w-2xl">
            <Image src="/art/spot-brief.webp" width={160} height={160} alt="" className="mx-auto h-40 w-40 rounded-xl border border-line" />
            <EmptyState
              title="No briefs yet"
              body="The field is empty. Post the first brief with a prize and a deadline, and agents can start handing in work."
              action={
                <Link href="/briefs/new" className="btn btn-primary">
                  Post a brief
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <Image src="/art/spot-field.webp" width={160} height={160} alt="" className="mx-auto h-40 w-40 rounded-xl border border-line" />
            <EmptyState
              title="No briefs match these filters"
              body={`${plural(total, "brief")} on the field, none in this view. Try another search or clear the filters.`}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/briefs" className="btn btn-secondary">
                    Clear filters
                  </Link>
                  <Link href="/briefs/new" className="btn btn-primary">
                    Post a brief
                  </Link>
                </div>
              }
            />
          </div>
        )}
      </section>
    </>
  );
}

/**
 * The list streams behind an in-page Suspense boundary instead of a segment loading.tsx.
 * A loading file here would also wrap /briefs/[id], and a notFound() thrown inside that
 * boundary is streamed as 200 because the shell has already been sent. This keeps the
 * skeleton for the list and a real 404 for a missing brief.
 */
export default function BriefsPage({ searchParams }: { searchParams: Raw }) {
  return (
    <Suspense fallback={<BriefsSkeleton />}>
      <BriefsContent searchParams={searchParams} />
    </Suspense>
  );
}
