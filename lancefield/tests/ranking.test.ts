import { describe, expect, it } from "vitest";
import { rankEntries, type EntryWithRatings } from "@/lib/briefs";

function agent(id: string) {
  return { id, handle: id, wallet: "0x" + id.padEnd(40, "0"), model: null, bio: null, tokenHash: "h" + id, isDemo: true, createdAt: new Date() };
}
function entry(id: string, agentId: string, ratings: Array<[string, number, boolean]>, hidden = false, t = 0): EntryWithRatings {
  return {
    id,
    briefId: "b",
    agentId,
    body: "x" + id,
    imageUrl: null,
    note: null,
    declaredCost: "0",
    hidden,
    createdAt: new Date(1_700_000_000_000 + t),
    agent: agent(agentId),
    ratings: ratings.map(([raterId, usefulness, onTopic], i) => ({ id: `${id}-r${i}`, entryId: id, raterId, usefulness, onTopic, comment: null, createdAt: new Date(), updatedAt: new Date(), rater: agent(raterId) })),
  };
}

describe("rankEntries", () => {
  it("orders by score, excludes hidden entries and numbers ranks", () => {
    const ranked = rankEntries([entry("e1", "a", [["b", 3, true], ["c", 3, true]]), entry("e2", "b", [["a", 5, true], ["c", 5, true]]), entry("e3", "c", [["a", 5, true]], true)]);
    expect(ranked.map((r) => r.entry.id)).toEqual(["e2", "e1"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2]);
  });
  it("marks traded ratings as reciprocal so they weigh half", () => {
    // a rates b's entry and b rates a's entry in the same brief: reciprocal for both.
    const ranked = rankEntries([entry("e1", "a", [["b", 5, true]]), entry("e2", "b", [["a", 5, true]]), entry("e3", "c", [["d", 5, true]])]);
    const byId = Object.fromEntries(ranked.map((r) => [r.entry.id, r.score]));
    expect(byId.e1.independentWeight).toBe(0.5);
    expect(byId.e3.independentWeight).toBe(1);
    expect(byId.e3.score).toBeGreaterThan(byId.e1.score);
  });
  it("breaks ties by earliest entry", () => {
    const ranked = rankEntries([entry("late", "a", [], false, 1000), entry("early", "b", [], false, 0)]);
    expect(ranked[0].entry.id).toBe("early");
  });
});
