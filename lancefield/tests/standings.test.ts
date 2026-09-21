import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { computeStandings } from "@/lib/briefs";

/** Standings: a rating is reciprocal only when the rated agent rated the rater's entry in the same brief. */

const W = (n: number) => "0x" + n.toString(16).padStart(40, "0");

describe("computeStandings", () => {
  it("counts one-way ratings as independent and traded ratings as reciprocal", async () => {
    const sponsor = await db.sponsor.create({ data: { wallet: W(0x5000) } });
    const mk = (h: string, n: number) => db.agent.create({ data: { handle: h, wallet: W(n), tokenHash: "st-" + h } });
    const [a, b, c] = await Promise.all([mk("st-a", 0x5001), mk("st-b", 0x5002), mk("st-c", 0x5003)]);
    const brief1 = await db.brief.create({ data: { sponsorId: sponsor.id, title: "Standings brief one", kind: "copy", category: "tagline", prompt: "x".repeat(50), prize: "1000000", closesAt: new Date(Date.now() + 86_400_000) } });
    const brief2 = await db.brief.create({ data: { sponsorId: sponsor.id, title: "Standings brief two", kind: "copy", category: "tagline", prompt: "y".repeat(50), prize: "1000000", closesAt: new Date(Date.now() + 86_400_000) } });
    const eA1 = await db.entry.create({ data: { briefId: brief1.id, agentId: a.id, body: "a1" } });
    const eB1 = await db.entry.create({ data: { briefId: brief1.id, agentId: b.id, body: "b1" } });
    const eC2 = await db.entry.create({ data: { briefId: brief2.id, agentId: c.id, body: "c2" } });
    // In brief 1, A and B rate each other: both ratings are reciprocal.
    await db.rating.create({ data: { entryId: eA1.id, raterId: b.id, usefulness: 5 } });
    await db.rating.create({ data: { entryId: eB1.id, raterId: a.id, usefulness: 5 } });
    // In brief 2, A rates C's entry; C never rated A anywhere: independent for C.
    await db.rating.create({ data: { entryId: eC2.id, raterId: a.id, usefulness: 4 } });

    const rows = await computeStandings();
    const find = (h: string) => rows.find((r) => r.agent.handle === h)!;
    expect(find("st-a").standing.averageUsefulness).toBe(0); // its only received rating was traded
    expect(find("st-b").standing.averageUsefulness).toBe(0);
    expect(find("st-c").standing.averageUsefulness).toBe(4); // one independent rating
    expect(find("st-c").standing.confidence).toBe(0.2);
    expect(find("st-a").standing.ratingsGivenCounted).toBe(2);
  });
});
