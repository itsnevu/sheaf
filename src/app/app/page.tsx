"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/app/PageHeader";
import ActivityFeed, { type FeedEvent } from "@/components/app/ActivityFeed";
import { useMe } from "@/components/app/AppShell";
import { Button, EmptyState, Money, Skeleton, StatusBadge, IconArrow } from "@/components/ui";
import { api, fmtRelative } from "@/lib/client";
import type { BatchDTO } from "@/lib/serialize";

interface Dashboard {
  mode: string;
  assetSymbol: string;
  assetDecimals: number;
  stats: { totalBatches: number; activeBatches: number; totalPayments: number; completed: number; pending: number; failed: number; retryEligible: number };
  recentBatches: BatchDTO[];
  recentEvents: FeedEvent[];
}

export default function OverviewPage() {
  const me = useMe();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: () => api<Dashboard>("/api/dashboard"), refetchInterval: 6000 });
  const d = q.data;
  const tiles: Array<[string, number | undefined, string?]> = d
    ? [
        ["Batches", d.stats.totalBatches, `${d.stats.activeBatches} active`],
        ["Payments", d.stats.totalPayments, "across executed batches"],
        ["Completed", d.stats.completed],
        ["Pending", d.stats.pending, "scheduled, submitted or confirming"],
        ["Failed", d.stats.failed, d.stats.retryEligible ? `+${d.stats.retryEligible} retry eligible` : undefined],
      ]
    : [];

  return (
    <>
      <PageHeader eyebrow={me.user.organizationName} title="Overview" description="Batch and payment status across your organisation." actions={me.can("batch.create") && <Button href="/app/batches/new" variant="primary">New batch <IconArrow /></Button>} />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {q.isLoading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : tiles.map(([label, value, sub]) => (
              <div key={label} className="card p-4">
                <div className="eyebrow">{label}</div>
                <div className="mt-1.5 font-display text-[1.75rem] font-medium leading-none tnum">{value ?? 0}</div>
                {sub && <div className="mt-1.5 text-[0.75rem] text-ink-faint">{sub}</div>}
              </div>
            ))}
      </section>
      {q.isError && (
        <p className="mt-3 error-text" role="alert">
          {(q.error as Error).message}
        </p>
      )}

      <div className="mt-8 grid min-w-0 gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="card min-w-0">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="title-2">Recent batches</h2>
            <Link href="/app/batches" className="text-[0.8125rem] text-ink-soft hover:text-ink">
              View all
            </Link>
          </header>
          {q.isLoading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : d?.recentBatches.length ? (
            <ul className="divide-y divide-line">
              {d.recentBatches.map((b) => (
                <li key={b.id}>
                  <Link href={`/app/batches/${b.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-ink/[.025]">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{b.name}</div>
                      <div className="text-[0.75rem] text-ink-faint">
                        {b.validCount} recipients · updated {fmtRelative(b.updatedAt)}
                        {b.mode === "demo" && " · demo"}
                      </div>
                    </div>
                    <Money units={b.totalAmount} decimals={b.assetDecimals} symbol={b.assetSymbol} className="hidden sm:inline text-[0.9rem]" />
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No batches yet" detail="Create a batch and upload a contractor CSV to get started." action={me.can("batch.create") && <Button href="/app/batches/new" variant="primary">New batch</Button>} />
          )}
        </section>

        <section className="card min-w-0">
          <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="title-2">Recent activity</h2>
            <Link href="/app/activity" className="text-[0.8125rem] text-ink-soft hover:text-ink">
              Full feed
            </Link>
          </header>
          <div className="px-5">{q.isLoading ? <Skeleton className="my-4 h-40" /> : <ActivityFeed events={d?.recentEvents ?? []} compact />}</div>
        </section>
      </div>
    </>
  );
}
