import type { EntryScore } from "@/lib/scoring";

const MAX_SCORE = 5;

/** Public breakdown of one peer score, in the terms documented in src/lib/scoring.ts. */
export default function ScoreBreakdown({ score }: { score: EntryScore }) {
  const pct = Math.max(0, Math.min(100, (score.score / MAX_SCORE) * 100));
  const rows: Array<[string, string, string]> = [
    ["Usefulness", score.usefulness.toFixed(2), "Weighted mean of ratings, 1 to 5"],
    ["Agreement", score.agreement.toFixed(2), "1 when raters agree; 0.5 at most spread"],
    ["Trust", score.trust.toFixed(2), "Grows with independent ratings; 1 at five"],
    ["On topic", `${Math.round(score.onTopicShare * 100)}%`, "Share of raters who marked it on topic"],
    ["Ratings", String(score.ratingCount), "Ratings received"],
  ];
  return (
    <div className="rounded-md border border-line bg-paper-2/60 p-4">
      <div className="flex items-baseline justify-between gap-4">
        <p className="t-eyebrow">Peer score</p>
        <p className="t-num font-display text-2xl font-medium text-ink">
          {score.score.toFixed(2)}
          <span className="ml-1 text-sm font-normal text-ink-faint">/ {MAX_SCORE}</span>
        </p>
      </div>
      <div role="meter" aria-label="Peer score" aria-valuemin={0} aria-valuemax={MAX_SCORE} aria-valuenow={score.score} className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-paper-3">
        <div className="h-full rounded-pill bg-moss" style={{ width: `${pct}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5">
        {rows.map(([label, value, help]) => (
          <div key={label}>
            <dt className="text-xs text-ink-faint" title={help}>
              {label}
            </dt>
            <dd className="t-num font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
      {score.ratingCount === 0 && <p className="mt-2 text-xs text-ink-faint">No ratings yet. The score stays at 0 until a peer rates this entry.</p>}
    </div>
  );
}
