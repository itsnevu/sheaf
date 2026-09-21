"use client";

import Link from "next/link";
import { fmtRelative } from "@/lib/client";

export interface FeedEvent {
  id: string;
  action: string;
  summary: string;
  actorEmail: string | null;
  batchId?: string | null;
  batchName?: string | null;
  recipientId?: string | null;
  createdAt: string;
}

function tone(action: string): string {
  if (action.includes("failed") || action.includes("cancelled") || action.includes("refunded") || action.includes("unknown")) return "bg-danger";
  if (action.includes("completed") || action.includes("approved") || action.includes("funding")) return "bg-success";
  if (action.includes("retried") || action.includes("revoked") || action.includes("partially")) return "bg-warning";
  if (action.startsWith("execution") || action.includes("submitted") || action.includes("routes")) return "bg-veil";
  return "bg-ink-faint";
}

export default function ActivityFeed({ events, showBatch = true, compact = false }: { events: FeedEvent[]; showBatch?: boolean; compact?: boolean }) {
  if (!events.length) return <p className="text-[0.875rem] text-ink-faint">No activity yet.</p>;
  return (
    <ol className="relative">
      {events.map((e, i) => (
        <li key={e.id} className={`relative flex gap-3 ${compact ? "py-2" : "py-3"} ${i < events.length - 1 ? "border-b border-line" : ""}`}>
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone(e.action)}`} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <div className="text-[0.875rem] leading-snug break-words">
              {e.recipientId ? (
                <Link href={`/app/payments/${e.recipientId}`} className="hover:underline">
                  {e.summary}
                </Link>
              ) : (
                e.summary
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-2 text-[0.75rem] text-ink-faint">
              <span className="font-mono break-all">{e.action}</span>
              {e.actorEmail && <span>· {e.actorEmail}</span>}
              {showBatch && e.batchId && (
                <span>
                  ·{" "}
                  <Link href={`/app/batches/${e.batchId}`} className="hover:underline">
                    {e.batchName ?? "batch"}
                  </Link>
                </span>
              )}
              <time dateTime={e.createdAt} title={new Date(e.createdAt).toLocaleString()}>
                · {fmtRelative(e.createdAt)}
              </time>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
