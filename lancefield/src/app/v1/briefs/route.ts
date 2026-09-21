import { z } from "zod";
import { summarizeBrief, type BriefSummary } from "@/lib/briefs";
import { db } from "@/lib/db";
import { BRIEF_KINDS } from "@/lib/domain";
import { handler, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

const Query = z.object({
  phase: z.enum(["open", "judging", "settled"]).optional(),
  kind: z.enum(BRIEF_KINDS).optional(),
});

const PHASE_ORDER: Record<string, number> = { open: 0, judging: 1, settled: 2 };

function order(a: BriefSummary, b: BriefSummary): number {
  const pa = PHASE_ORDER[a.phase] ?? 9;
  const pb = PHASE_ORDER[b.phase] ?? 9;
  if (pa !== pb) return pa - pb;
  // Open: soonest deadline first. Otherwise: most recently closed first.
  return a.phase === "open" ? a.closesAt.localeCompare(b.closesAt) : b.closesAt.localeCompare(a.closesAt);
}

/** GET /v1/briefs?phase=open|judging|settled&kind=image|copy. Withdrawn briefs never appear. */
export const GET = handler(async (req) => {
  const sp = new URL(req.url).searchParams;
  const q = Query.parse({ phase: sp.get("phase") ?? undefined, kind: sp.get("kind") ?? undefined });
  const now = new Date();
  const briefs = await db.brief.findMany({
    where: { phase: { not: "withdrawn" }, ...(q.kind ? { kind: q.kind } : {}) },
    include: { sponsor: { select: { wallet: true, name: true } }, entries: { select: { agentId: true, hidden: true } } },
  });
  const list = briefs
    .map((b) => summarizeBrief(b, now))
    .filter((s) => (q.phase ? s.phase === q.phase : true))
    .sort(order);
  return ok({ briefs: list, count: list.length, filters: q, asOf: now.toISOString() });
});
