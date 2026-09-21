"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/app/PageHeader";
import { useMe } from "@/components/app/AppShell";
import { Button, EmptyState, Input, Money, Select, Skeleton, StatusBadge, IconArrow } from "@/components/ui";
import { api, fmtDate } from "@/lib/client";
import { BATCH_STATUS, statusLabel } from "@/lib/domain/states";
import type { BatchDTO } from "@/lib/serialize";

export default function BatchesPage() {
  const me = useMe();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const query = useQuery({ queryKey: ["batches", q, status], queryFn: () => api<{ batches: BatchDTO[] }>(`/api/batches?q=${encodeURIComponent(q)}&status=${status}`), refetchInterval: 8000 });
  const rows = query.data?.batches ?? [];

  return (
    <>
      <PageHeader title="Batches" description="Every payment batch, from draft to reconciled." actions={me.can("batch.create") && <Button href="/app/batches/new" variant="primary">New batch <IconArrow /></Button>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <Input type="search" placeholder="Search by name, reference or id" aria-label="Search batches" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {BATCH_STATUS.map((s) => (
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
            <Skeleton className="h-10" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={q || status ? "No batches match" : "No batches yet"} detail={q || status ? "Try a different search or status." : "Create a batch and upload a contractor CSV."} action={!q && !status && me.can("batch.create") && <Button href="/app/batches/new" variant="primary">New batch</Button>} />
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((b) => (
                <li key={b.id}>
                  <Link href={`/app/batches/${b.id}`} className="block px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium">{b.name}</div>
                        <div className="text-[0.75rem] text-ink-faint">{b.reference ?? "no reference"} · {fmtDate(b.createdAt)}</div>
                      </div>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[0.875rem]">
                      <span className="text-ink-soft">{b.validCount} recipients{b.invalidCount ? ` · ${b.invalidCount} invalid` : ""}</span>
                      <Money units={b.totalAmount} decimals={b.assetDecimals} symbol={b.assetSymbol} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {/* Desktop table */}
            <div className="hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Status</th>
                    <th className="text-right">Recipients</th>
                    <th className="text-right">Total</th>
                    <th>Mode</th>
                    <th>Created</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <Link href={`/app/batches/${b.id}`} className="font-medium hover:underline">
                          {b.name}
                        </Link>
                        <div className="text-[0.75rem] text-ink-faint">{b.reference ?? <span className="font-mono">{b.id.slice(0, 10)}</span>}</div>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td className="text-right tnum">
                        {b.validCount}
                        {b.invalidCount ? <span className="ml-1 text-danger">+{b.invalidCount} invalid</span> : null}
                      </td>
                      <td className="text-right">
                        <Money units={b.totalAmount} decimals={b.assetDecimals} symbol={b.assetSymbol} />
                      </td>
                      <td>{b.mode === "demo" ? <span className="badge badge-warning">demo</span> : <span className="badge badge-progress">real</span>}</td>
                      <td className="text-ink-soft whitespace-nowrap">{fmtDate(b.createdAt)}</td>
                      <td className="text-right">
                        <Link href={`/app/batches/${b.id}`} className="btn btn-ghost btn-sm">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
