import type { Agent, Brief, Entry, Rating } from "@prisma/client";
import { db } from "./db";
import { effectivePhase, LIMITS, type BriefPhase } from "./domain";
import { HttpError } from "./http";
import { scoreEntry, standingPoints, type EntryScore } from "./scoring";

/** Read models shared by pages and the /v1 API. Pure functions where possible so they are testable. */

export type EntryWithRatings = Entry & { agent: Agent; ratings: (Rating & { rater: Agent })[] };

export interface RankedEntry {
  entry: EntryWithRatings;
  score: EntryScore;
  rank: number;
}

/** Score every visible entry of a brief, marking reciprocal ratings (A rated B and B rated A in this brief). */
export function rankEntries(entries: EntryWithRatings[]): RankedEntry[] {
  const ratedBy = new Map<string, Set<string>>(); // agentId → set of agentIds who rated their entries
  for (const e of entries) for (const r of e.ratings) (ratedBy.get(e.agentId) ?? ratedBy.set(e.agentId, new Set()).get(e.agentId)!).add(r.raterId);
  const scored = entries
    .filter((e) => !e.hidden)
    .map((entry) => {
      const score = scoreEntry(
        entry.ratings.map((r) => ({
          raterId: r.raterId,
          usefulness: r.usefulness,
          onTopic: r.onTopic,
          reciprocal: ratedBy.get(r.raterId)?.has(entry.agentId) ?? false,
        })),
      );
      return { entry, score, rank: 0 };
    })
    .sort((a, b) => b.score.score - a.score.score || a.entry.createdAt.getTime() - b.entry.createdAt.getTime());
  scored.forEach((s, i) => (s.rank = i + 1));
  return scored;
}

export const briefInclude = { sponsor: true, entries: { include: { agent: true, ratings: { include: { rater: true } } }, orderBy: { createdAt: "asc" as const } } };

export async function loadBrief(id: string) {
  const brief = await db.brief.findUnique({ where: { id }, include: briefInclude });
  if (!brief) throw new HttpError(404, "not_found", "No brief with that id");
  return brief;
}

export function briefPhase(b: Pick<Brief, "phase" | "closesAt">, now = new Date()): BriefPhase {
  return effectivePhase(b.phase, b.closesAt, now);
}

export interface BriefSummary {
  id: string;
  title: string;
  kind: string;
  category: string;
  phase: BriefPhase;
  prize: string;
  currency: string;
  closesAt: string;
  createdAt: string;
  sponsorName: string;
  sponsorWallet: string;
  entryCount: number;
  agentCount: number;
  hasWinner: boolean;
  isHouse: boolean;
  isDemo: boolean;
}

export function summarizeBrief(b: Brief & { sponsor: { wallet: string; name: string | null }; entries: Pick<Entry, "agentId" | "hidden">[] }, now = new Date()): BriefSummary {
  const visible = b.entries.filter((e) => !e.hidden);
  return {
    id: b.id,
    title: b.title,
    kind: b.kind,
    category: b.category,
    phase: briefPhase(b, now),
    prize: b.prize,
    currency: b.currency,
    closesAt: b.closesAt.toISOString(),
    createdAt: b.createdAt.toISOString(),
    sponsorName: b.sponsor.name ?? (b.isHouse ? "Lancefield house" : "Sponsor"),
    sponsorWallet: b.sponsor.wallet,
    entryCount: visible.length,
    agentCount: new Set(visible.map((e) => e.agentId)).size,
    hasWinner: !!b.winnerEntryId,
    isHouse: b.isHouse,
    isDemo: b.isDemo,
  };
}

/** Standings across every settled and open brief. */
export async function computeStandings(now = new Date()) {
  const agents = await db.agent.findMany({ include: { entries: { include: { brief: { include: { entries: { select: { agentId: true, hidden: true } } } }, ratings: { include: { rater: true } } } }, ratings: true } });
  const rows = agents.map((a) => {
    let wins = 0;
    let usefulnessSum = 0;
    let independent = 0;
    for (const e of a.entries) {
      const competitors = new Set(e.brief.entries.filter((x) => !x.hidden).map((x) => x.agentId)).size;
      if (e.brief.winnerEntryId === e.id && competitors >= LIMITS.minAgentsForWin) wins++;
      // A rating is independent when the rater did not receive a rating from this agent in the same brief.
      const ratedBackIds = new Set(a.ratings.filter((r) => r.entryId !== e.id).map((r) => r.entryId));
      for (const r of e.ratings) {
        const reciprocal = a.ratings.some((mine) => ratedBackIds.has(mine.entryId) && mine.entryId !== e.id && e.brief.entries.some((x) => x.agentId === r.raterId));
        if (!reciprocal) {
          usefulnessSum += r.usefulness;
          independent++;
        }
      }
    }
    const standing = standingPoints({ wins, usefulnessSum, independentRatingsReceived: independent, ratingsGiven: a.ratings.length });
    return { agent: a, standing, entries: a.entries.length, briefsEntered: new Set(a.entries.map((e) => e.briefId)).size };
  });
  rows.sort((x, y) => y.standing.points - x.standing.points || y.standing.wins - x.standing.wins || x.agent.createdAt.getTime() - y.agent.createdAt.getTime());
  void now;
  return rows;
}
