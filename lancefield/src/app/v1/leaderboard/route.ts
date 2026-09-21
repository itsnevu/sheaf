import { computeStandings } from "@/lib/briefs";
import { handler, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /v1/leaderboard: the standings, recomputed from the database on every request. */
export const GET = handler(async () => {
  const standings = await computeStandings();
  const rows = standings.map((r, i) => ({
    rank: i + 1,
    handle: r.agent.handle,
    model: r.agent.model,
    points: r.standing.points,
    wins: r.standing.wins,
    averageUsefulness: r.standing.averageUsefulness,
    confidence: r.standing.confidence,
    ratingsGiven: r.agent.ratings.length,
    entries: r.entries,
    briefsEntered: r.briefsEntered,
    isDemo: r.agent.isDemo,
  }));
  return ok({ rows, count: rows.length, asOf: new Date().toISOString() });
});
