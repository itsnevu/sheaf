"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/app/PageHeader";
import { Address, Button, EmptyState, Input, Money, Select, Skeleton, StatusBadge, TxHash } from "@/components/ui";
import { api, fmtDate } from "@/lib/client";
import { RECIPIENT_STATUS, statusLabel } from "@/lib/domain/states";
import type { RecipientDTO } from "@/lib/serialize";

type Row = RecipientDTO & { batchName: string; batchMode: string; assetDecimals: number; txHash: string | null; simulated: boolean };

/** Every executed leg across operations, newest operation first. Reconciliation has its own page. */
export default function ExecutionsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const query = useQuery({ queryKey: ["executions", q, status, page], queryFn: () => api<{ total: number; rows: Row[] }>(`/api/reconciliation?q=${encodeURIComponent(q)}&status=${status}&page=${page}&pageSize=${pageSize}`), placeholderData: (prev) => prev, refetchInterval: 8000 });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <PageHeader title="Executions" description="Every leg that has been queued, submitted, settled or failed. Demo legs are always flagged as simulated." />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_220px]">
        <Input type="search" aria-label="Search executions" placeholder="Label, address, memo, tx hash or operation" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select aria-label="Leg status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any leg status</option>
          {RECIPIENT_STATUS.filter((s) => !["PENDING", "ROUTED", "ROUTE_UNAVAILABLE"].includes(s)).map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
      </div>
      <div className="card overflow-hidden">
        {query.isLoading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No executions match" detail={q || status ? "Adjust the search or filter." : "Legs appear here once an operation has been funded and executed."} />
        ) : (
          <>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((r) => (
                <li key={r.id} className="px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/app/payments/${r.id}`} className="font-medium hover:underline">
                        {r.name}
                      </Link>
                      <div className="text-[0.75rem] text-ink-faint">
                        {r.batchName} · leg {r.rowNumber}
                      </div>
                    </div>
                    <Money units={r.amount} decimals={r.assetDecimals} symbol={r.assetSymbol} className="font-medium" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    <TxHash value={r.txHash} simulated={r.simulated} />
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block table-wrap !mx-0 !px-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Leg</th>
                    <th>Operation</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th>Reference</th>
                    <th>Submitted</th>
                    <th>Completed</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/app/payments/${r.id}`} className="font-medium hover:underline">
                          {r.name}
                        </Link>
                        <div>
                          <Address value={r.address} redacted={r.addressRedacted} />
                        </div>
                      </td>
                      <td className="max-w-[14rem]">
                        <div className="truncate text-[0.875rem]" title={r.batchName}>
                          <Link href={`/app/batches/${r.batchId}`} className="hover:underline">
                            {r.batchName}
                          </Link>
                        </div>
                        <div className="text-[0.75rem] text-ink-faint">
                          leg {r.rowNumber} {r.batchMode === "demo" && "· demo"}
                        </div>
                      </td>
                      <td className="text-right">
                        <Money units={r.amount} decimals={r.assetDecimals} symbol={r.assetSymbol} />
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                        {r.lastError && <div className="max-w-[16rem] truncate text-[0.75rem] text-danger" title={r.lastError}>{r.lastError}</div>}
                      </td>
                      <td>
                        <TxHash value={r.txHash} simulated={r.simulated} />
                      </td>
                      <td className="text-ink-soft whitespace-nowrap">{fmtDate(r.submittedAt)}</td>
                      <td className="text-ink-soft whitespace-nowrap">{fmtDate(r.completedAt)}</td>
                      <td className="text-right">
                        <Link href={`/app/payments/${r.id}`} className="btn btn-ghost btn-sm">
                          Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-[0.8125rem] text-ink-soft">
              <span>
                {total} leg(s) · page {page} of {pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
