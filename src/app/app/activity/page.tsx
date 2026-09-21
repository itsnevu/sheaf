"use client";

import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import PageHeader from "@/components/app/PageHeader";
import ActivityFeed, { type FeedEvent } from "@/components/app/ActivityFeed";
import { Button, Select, Skeleton } from "@/components/ui";
import { api } from "@/lib/client";

const TYPES: Array<[string, string]> = [
  ["", "All events"],
  ["batch", "Batch lifecycle"],
  ["csv", "CSV validation"],
  ["routes", "Route preparation"],
  ["funding", "Funding"],
  ["execution", "Execution"],
  ["payment", "Payments (submitted, completed, failed, retried)"],
  ["reconciliation", "Reconciliation"],
  ["export", "Exports"],
  ["settings", "Settings"],
  ["member", "Members"],
];

export default function ActivityPage() {
  const [type, setType] = useState("");
  const q = useInfiniteQuery({
    queryKey: ["activity", type],
    queryFn: ({ pageParam }) => api<{ events: FeedEvent[]; nextCursor: string | null }>(`/api/activity?type=${type}&limit=40${pageParam ? `&cursor=${pageParam}` : ""}`),
    initialPageParam: "" as string,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchInterval: 8000,
  });
  const events = q.data?.pages.flatMap((p) => p.events) ?? [];
  return (
    <>
      <PageHeader title="Activity" description="Every recorded action across batches, payments, reconciliation and settings." actions={<Select aria-label="Filter events" value={type} onChange={(e) => setType(e.target.value)} className="w-72">{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>} />
      <div className="card px-5">
        {q.isLoading ? (
          <div className="space-y-3 py-5">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (
          <div className="py-2">
            <ActivityFeed events={events} />
          </div>
        )}
        {q.hasNextPage && (
          <div className="flex justify-center border-t border-line py-4">
            <Button variant="secondary" size="sm" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
