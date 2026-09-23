"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/app/PageHeader";
import { useMe } from "@/components/app/AppShell";
import { Address, Button, Dialog, EmptyState, Input, Money, Select, Skeleton, StatusBadge, Textarea, TxHash } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, downloadUrl, fmtDate } from "@/lib/client";
import { RECIPIENT_STATUS, RECON_STATUS, statusLabel } from "@/lib/domain/states";
import { ROBINHOOD_CHAIN_ID, txUrl } from "@/lib/config";
import { toDisplayUsd } from "@/lib/money";
import type { RecipientDTO } from "@/lib/serialize";

type Row = RecipientDTO & { batchName: string; batchMode: string; assetDecimals: number; txHash: string | null; simulated: boolean };

export default function ReconciliationPage() {
  const me = useMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [recon, setRecon] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Row | null>(null);
  const pageSize = 25;
  const query = useQuery({ queryKey: ["recon", q, status, recon, page], queryFn: () => api<{ total: number; rows: Row[] }>(`/api/reconciliation?q=${encodeURIComponent(q)}&status=${status}&recon=${recon}&page=${page}&pageSize=${pageSize}`), placeholderData: (prev) => prev });
  const rows = query.data?.rows ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  const save = async (rid: string, s: string, note: string) => {
    try {
      await api(`/api/reconciliation/${rid}`, { method: "PATCH", json: { status: s, note: note || null } });
      toast("Reconciliation updated", { tone: "success" });
      qc.invalidateQueries({ queryKey: ["recon"] });
      setEditing(null);
    } catch (e) {
      toast((e as Error).message, { tone: "danger" });
    }
  };

  return (
    <>
      <PageHeader title="Reconciliation" description="Match every executed leg to its reference. Demo legs are always flagged as simulated." actions={me.can("export.download") && <Button variant="secondary" onClick={() => downloadUrl("/api/export")}>Export all (CSV)</Button>} />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_200px_200px]">
        <Input type="search" aria-label="Search legs" placeholder="Label, address, memo, tx hash or operation" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <Select aria-label="Leg status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Any leg status</option>
          {RECIPIENT_STATUS.filter((s) => !["PENDING", "ROUTED", "ROUTE_UNAVAILABLE"].includes(s)).map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        <Select aria-label="Reconciliation state" value={recon} onChange={(e) => { setRecon(e.target.value); setPage(1); }}>
          <option value="">Any reconciliation state</option>
          {RECON_STATUS.map((s) => (
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
          <EmptyState title="No legs match" detail={q || status || recon ? "Adjust the search or filters." : "Executed legs appear here once an operation has run."} />
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
                      <div className="text-[0.75rem] text-ink-faint">{r.batchName} · leg {r.rowNumber}</div>
                    </div>
                    <Money units={r.amount} decimals={r.assetDecimals} symbol={r.assetSymbol} className="font-medium" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    <StatusBadge status={r.reconciliation?.status ?? "UNRECONCILED"} />
                    <TxHash value={r.txHash} simulated={r.simulated} />
                  </div>
                  {me.can("reconciliation.edit") && (
                    <Button size="sm" variant="ghost" className="mt-2" onClick={() => setEditing(r)}>
                      Update
                    </Button>
                  )}
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
                    <th className="text-right">Fee (est.)</th>
                    <th>Reconciliation</th>
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
                        <div className="truncate text-[0.875rem]" title={r.batchName}>{r.batchName}</div>
                        <div className="text-[0.75rem] text-ink-faint">
                          leg {r.rowNumber} · {r.reference ?? "no memo"} {r.batchMode === "demo" && "· demo"}
                        </div>
                      </td>
                      <td className="text-right">
                        <Money units={r.amount} decimals={r.assetDecimals} symbol={r.assetSymbol} />
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                        {r.completedAt && <div className="text-[0.75rem] text-ink-faint">{fmtDate(r.completedAt)}</div>}
                      </td>
                      <td>
                        <TxHash value={r.txHash} url={r.txHash && !r.simulated ? txUrl(ROBINHOOD_CHAIN_ID, r.txHash) : null} simulated={r.simulated} />
                      </td>
                      <td className="text-right tnum">{toDisplayUsd(r.route?.feeTotalUsd)}</td>
                      <td>
                        <StatusBadge status={r.reconciliation?.status ?? "UNRECONCILED"} />
                        {r.reconciliation?.note && <div className="max-w-[14rem] truncate text-[0.75rem] text-ink-faint" title={r.reconciliation.note}>{r.reconciliation.note}</div>}
                      </td>
                      <td className="text-right">{me.can("reconciliation.edit") && <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>Update</Button>}</td>
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
      {editing && <ReconDialog row={editing} onClose={() => setEditing(null)} onSave={save} />}
    </>
  );
}

function ReconDialog({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (rid: string, status: string, note: string) => Promise<void> }) {
  const [status, setStatus] = useState(row.reconciliation?.status ?? "UNRECONCILED");
  const [note, setNote] = useState(row.reconciliation?.note ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog open onClose={onClose} title={`Reconcile · ${row.name}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={async () => { setBusy(true); try { await onSave(row.id, status, note); } finally { setBusy(false); } }}>Save</Button></>}>
      <div className="space-y-4">
        <Select label="Reconciliation state" value={status} onChange={(e) => setStatus(e.target.value)}>
          {RECON_STATUS.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        <Textarea label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Matched to bank statement line 42" />
        <p className="text-[0.8125rem] text-ink-faint">Leg status: {statusLabel(row.status)}. Reference: {row.txHash ? row.txHash.slice(0, 14) + "…" : "none"}{row.simulated ? " (simulated)" : ""}.</p>
      </div>
    </Dialog>
  );
}
