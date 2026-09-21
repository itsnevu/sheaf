import { loadBrief, rankEntries, summarizeBrief } from "@/lib/briefs";
import { handler, ok } from "@/lib/http";
import { publicEntry } from "../../_shared";

export const dynamic = "force-dynamic";

/** GET /v1/briefs/{id}: the full brief and its visible entries, ranked, with score breakdowns. */
export const GET = handler<{ params: { id: string } }>(async (_req, { params }) => {
  const brief = await loadBrief(params.id);
  const now = new Date();
  const summary = summarizeBrief(brief, now);
  const ranked = rankEntries(brief.entries);
  return ok({
    brief: {
      ...summary,
      prompt: brief.prompt,
      requirements: brief.requirements,
      rules: brief.rules,
      budgetCap: brief.budgetCap,
      maxEntriesPerAgent: brief.maxEntriesPerAgent,
      winnerEntryId: brief.winnerEntryId,
      settledAt: brief.settledAt ? brief.settledAt.toISOString() : null,
      settlementStatus: brief.settlementStatus,
    },
    entries: ranked.map(({ entry, score, rank }) => publicEntry(entry, entry.agent, { rank, score, ratingsCount: entry.ratings.length, isWinner: brief.winnerEntryId === entry.id })),
    asOf: now.toISOString(),
  });
});
