import { describe, expect, it } from "vitest";
import { scoreEntry, standingPoints } from "@/lib/scoring";

const r = (raterId: string, usefulness: number, onTopic = true, reciprocal = false) => ({ raterId, usefulness, onTopic, reciprocal });

describe("scoreEntry", () => {
  it("is zero without ratings", () => {
    expect(scoreEntry([]).score).toBe(0);
    expect(scoreEntry([]).ratingCount).toBe(0);
  });
  it("one rating is not a ranking: trust is low", () => {
    const one = scoreEntry([r("a", 5)]);
    expect(one.usefulness).toBe(5);
    expect(one.trust).toBeCloseTo(0.48, 2);
    expect(one.score).toBeLessThan(2.5);
  });
  it("five agreeing on-topic ratings reach full trust", () => {
    const s = scoreEntry(["a", "b", "c", "d", "e"].map((id) => r(id, 4)));
    expect(s.trust).toBe(1);
    expect(s.agreement).toBe(1);
    expect(s.onTopicShare).toBe(1);
    expect(s.score).toBe(4);
  });
  it("disagreement lowers the score but never below half", () => {
    const s = scoreEntry([r("a", 1), r("b", 5), r("c", 1), r("d", 5), r("e", 1)]);
    expect(s.agreement).toBeGreaterThanOrEqual(0.5);
    expect(s.agreement).toBeLessThan(1);
  });
  it("off-topic marks halve the score at the limit", () => {
    const on = scoreEntry(["a", "b", "c", "d", "e"].map((id) => r(id, 4, true)));
    const off = scoreEntry(["a", "b", "c", "d", "e"].map((id) => r(id, 4, false)));
    expect(off.score).toBeCloseTo(on.score / 2, 3);
  });
  it("reciprocal ratings count half", () => {
    const independent = scoreEntry([r("a", 5), r("b", 5)]);
    const traded = scoreEntry([r("a", 5, true, true), r("b", 5, true, true)]);
    expect(traded.independentWeight).toBe(1);
    expect(traded.trust).toBeLessThan(independent.trust);
  });
});

describe("standingPoints", () => {
  it("weights wins most, then usefulness with confidence, then ratings given up to 50", () => {
    const s = standingPoints({ wins: 2, usefulnessSum: 20, independentRatingsReceived: 5, ratingsGiven: 80 });
    expect(s.confidence).toBe(1);
    expect(s.averageUsefulness).toBe(4);
    expect(s.ratingsGivenCounted).toBe(50);
    expect(s.points).toBe(200 + 40 + 50);
  });
  it("confidence scales with independent ratings", () => {
    const s = standingPoints({ wins: 0, usefulnessSum: 10, independentRatingsReceived: 2, ratingsGiven: 0 });
    expect(s.confidence).toBe(0.4);
    expect(s.points).toBe(20);
  });
  it("nothing received gives no usefulness points", () => {
    expect(standingPoints({ wins: 0, usefulnessSum: 0, independentRatingsReceived: 0, ratingsGiven: 3 }).points).toBe(3);
  });
});
