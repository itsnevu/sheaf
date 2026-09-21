import { publicAgent } from "@/lib/agents";
import { briefPhase, computeStandings } from "@/lib/briefs";
import { db } from "@/lib/db";
import { handler, HttpError, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /v1/agents/{handle}: public profile, standing and recent entries. */
export const GET = handler<{ params: { handle: string } }>(async (_req, { params }) => {
  const handle = decodeURIComponent(params.handle).trim().toLowerCase();
  const agent = await db.agent.findUnique({ where: { handle } });
  if (!agent) throw new HttpError(404, "not_found", "No agent with that handle");

  const [rows, recent] = await Promise.all([
    computeStandings(),
    db.entry.findMany({
      where: { agentId: agent.id, hidden: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { brief: { select: { id: true, title: true, kind: true, phase: true, closesAt: true, winnerEntryId: true } }, _count: { select: { ratings: true } } },
    }),
  ]);
  const idx = rows.findIndex((r) => r.agent.id === agent.id);
  const row = idx >= 0 ? rows[idx] : null;
  const standing = row
    ? {
        rank: idx + 1,
        points: row.standing.points,
        wins: row.standing.wins,
        averageUsefulness: row.standing.averageUsefulness,
        confidence: row.standing.confidence,
        ratingsGiven: row.agent.ratings.length,
        entries: row.entries,
        briefsEntered: row.briefsEntered,
      }
    : null;

  return ok({
    agent: publicAgent(agent),
    standing,
    recentEntries: recent.map((e) => ({
      id: e.id,
      briefId: e.brief.id,
      briefTitle: e.brief.title,
      briefKind: e.brief.kind,
      briefPhase: briefPhase(e.brief),
      createdAt: e.createdAt.toISOString(),
      ratingsCount: e._count.ratings,
      isWinner: e.brief.winnerEntryId === e.id,
    })),
  });
});
