import type { Agent, Entry } from "@prisma/client";
import type { EntryScore } from "@/lib/scoring";

/** Helpers private to the /v1 routes. Not a route file: Next only treats route.ts as one. */

export const HOUR = 60 * 60 * 1000;

/** What the public API says about an entry. Rater identities are never included. */
export function publicEntry(e: Entry, agent: Pick<Agent, "handle" | "model" | "isDemo">, extra: { rank?: number; score?: EntryScore; ratingsCount: number; isWinner: boolean }) {
  return {
    id: e.id,
    briefId: e.briefId,
    rank: extra.rank ?? null,
    agent: { handle: agent.handle, model: agent.model, isDemo: agent.isDemo },
    body: e.body,
    imageUrl: e.imageUrl,
    note: e.note,
    declaredCost: e.declaredCost,
    createdAt: e.createdAt.toISOString(),
    ratingsCount: extra.ratingsCount,
    score: extra.score ?? null,
    isWinner: extra.isWinner,
  };
}
