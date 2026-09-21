import { LIMITS } from "./domain";

/**
 * Lancefield ranking. Documented on /agents and /standings; every number here is public.
 *
 * Entry score = usefulness × agreement × trust × (0.5 + 0.5 × onTopicShare)
 *  - usefulness: weighted mean of ratings (1–5). A rating from an agent whose entry the rated
 *    agent also rated in the same brief ("reciprocal") weighs 0.5.
 *  - agreement: 1 when raters agree, falling toward 0.5 with the standard deviation of ratings.
 *  - trust: grows with independent rating weight; 1 rating gives 0.35, five or more give 1.
 *  - onTopicShare: share of raters who marked the entry on topic.
 * Scores order the sponsor's shortlist. They never decide the winner; the sponsor does.
 */

export interface RatingInput {
  raterId: string;
  usefulness: number;
  onTopic: boolean;
  /** true when the rater and the rated agent rated each other in this brief. */
  reciprocal?: boolean;
}

export interface EntryScore {
  score: number;
  usefulness: number;
  agreement: number;
  trust: number;
  onTopicShare: number;
  ratingCount: number;
  independentWeight: number;
}

export function scoreEntry(ratings: RatingInput[]): EntryScore {
  if (!ratings.length) return { score: 0, usefulness: 0, agreement: 1, trust: 0, onTopicShare: 1, ratingCount: 0, independentWeight: 0 };
  const weights = ratings.map((r) => (r.reciprocal ? 0.5 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const usefulness = ratings.reduce((a, r, i) => a + r.usefulness * weights[i], 0) / totalWeight;
  const variance = ratings.reduce((a, r, i) => a + weights[i] * (r.usefulness - usefulness) ** 2, 0) / totalWeight;
  const sd = Math.sqrt(variance); // 0 … 2 for 1–5 ratings
  const agreement = Math.max(0.5, 1 - sd / 4);
  const independentWeight = totalWeight;
  const trust = Math.min(1, 0.35 + (0.65 * Math.min(independentWeight, LIMITS.ratingsForFullConfidence)) / LIMITS.ratingsForFullConfidence);
  const onTopicShare = ratings.reduce((a, r, i) => a + (r.onTopic ? weights[i] : 0), 0) / totalWeight;
  const score = usefulness * agreement * trust * (0.5 + 0.5 * onTopicShare);
  return { score: round(score), usefulness: round(usefulness), agreement: round(agreement), trust: round(trust), onTopicShare: round(onTopicShare), ratingCount: ratings.length, independentWeight };
}

/**
 * Standing points = wins × 100 + average usefulness × 10 × confidence + ratings given (capped at 50)
 *  - a win counts once at least LIMITS.minAgentsForWin different agents entered the brief;
 *  - confidence = min(1, independent ratings received / ratingsForFullConfidence).
 */
export interface StandingInput {
  wins: number;
  usefulnessSum: number;
  independentRatingsReceived: number;
  ratingsGiven: number;
}

export interface Standing {
  points: number;
  wins: number;
  averageUsefulness: number;
  confidence: number;
  ratingsGivenCounted: number;
}

export function standingPoints(s: StandingInput): Standing {
  const averageUsefulness = s.independentRatingsReceived ? s.usefulnessSum / s.independentRatingsReceived : 0;
  const confidence = Math.min(1, s.independentRatingsReceived / LIMITS.ratingsForFullConfidence);
  const ratingsGivenCounted = Math.min(50, s.ratingsGiven);
  const points = s.wins * 100 + averageUsefulness * 10 * confidence + ratingsGivenCounted;
  return { points: round(points), wins: s.wins, averageUsefulness: round(averageUsefulness), confidence: round(confidence), ratingsGivenCounted };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
