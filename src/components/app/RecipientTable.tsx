"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Address, Button, Dialog, Input, Money, StatusBadge, Tabs, IconWarn } from "@/components/ui";
import type { RecipientDTO } from "@/lib/serialize";

interface Props {
  recipients: RecipientDTO[];
  assetDecimals: number;
  assetSymbol: string;
  editable: boolean;
  showExecution: boolean;
  onUpdate?: (id: string, patch: { name?: string; address?: string; amount?: string; reference?: string | null }) => Promise<void>;
  onRemove?: (id: string) => Promise<void>;
  onRetry?: (id: string) => Promise<void>;
  canRetry?: boolean;
}

type Filter = "all" | "invalid" | "attention" | "completed";

export default function RecipientTable({ recipients, assetDecimals, assetSymbol, editable, showExecution, onUpdate, onRemove, onRetry, canRetry }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<RecipientDTO | null>(null);
  const [removing, setRemoving] = useState<RecipientDTO | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      all: recipients.length,
      invalid: recipients.filter((r) => !r.valid).length,
      attention: recipients.filter((r) => ["FAILED", "RETRY_ELIGIBLE", "REFUNDED", "ROUTE_UNAVAILABLE"].includes(r.status)).length,
      completed: recipients.filter((r) => r.status === "COMPLETED").length,
    }),
    [recipients],
  );

  const rows = useMemo(() => {
    let list = recipients;
    if (filter === "invalid") list = list.filter((r) => !r.valid);
    if (filter === "attention") list = list.filter((r) => ["FAILED", "RETRY_ELIGIBLE", "REFUNDED", "ROUTE_UNAVAILABLE"].includes(r.status));
    if (filter === "completed") list = list.filter((r) => r.status === "COMPLETED");
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(s) || (r.address ?? r.addressInput).toLowerCase().includes(s) || (r.reference ?? "").toLowerCase().includes(s) || String(r.rowNumber) === s);
    }
    return list;
  }, [recipients, filter, q]);

  const tabs = [
    { id: "all" as const, label: "All", count: counts.all },
    { id: "invalid" as const, label: "Invalid", count: counts.invalid },
    ...(showExecution ? [{ id: "attention" as const, label: "Needs attention", count: counts.attention }, { id: "completed" as const, label: "Completed", count: counts.completed }] : []),
  ];

  const retry = async (id: string) => {
    if (!onRetry) return;
    setBusy(id);
    try {
      await onRetry(id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs tabs={tabs} value={filter} onChange={setFilter} className="flex-1" />
        <Input type="search" aria-label="Search recipients" placeholder="Search name, address, reference, row" value={q} onChange={(e) => setQ(e.target.value)} className="sm:w-72" />
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-[0.875rem] text-ink-faint">No rows match.</p>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="mt-4 space-y-3 md:hidden">
            {rows.map((r) => (
              <li key={r.id} className={`card p-4 ${!r.valid ? "border-danger/40" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[0.75rem] text-ink-faint">Row {r.rowNumber}</div>
                    <div className="truncate font-medium">{r.name || <span className="text-danger">No name</span>}</div>
                    <div className="mt-0.5">
                      <Address value={r.address ?? r.addressInput} redacted={r.addressRedacted} />
                    </div>
                  </div>
                  <div className="text-right">
                    <Money units={r.amount} decimals={assetDecimals} symbol={assetSymbol} className="block font-medium" />
                    {!r.amount && <span className="text-danger tnum">{r.amountInput || "—"}</span>}
                    <div className="mt-1">{r.valid ? showExecution ? <StatusBadge status={r.status} /> : r.route?.status === "QUOTED" ? <StatusBadge status="ROUTED" /> : <StatusBadge tone="success">Valid</StatusBadge> : <StatusBadge tone="danger">Invalid</StatusBadge>}</div>
                  </div>
                </div>
                <RowIssues r={r} />
                <RowActions r={r} editable={editable} showExecution={showExecution} canRetry={canRetry} busy={busy} onEdit={() => setEditing(r)} onRemove={() => setRemoving(r)} onRetry={() => retry(r.id)} />
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="table-wrap mt-4 hidden md:block">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Recipient</th>
                  <th>Address</th>
                  <th className="text-right">Amount</th>
                  <th>Reference</th>
                  <th>{showExecution ? "Status" : "Route"}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={!r.valid ? "bg-danger-tint/40" : ""}>
                    <td className="tnum text-ink-faint">{r.rowNumber}</td>
                    <td>
                      <div className="font-medium">{r.name || <span className="text-danger">No name</span>}</div>
                      <RowIssues r={r} inline />
                    </td>
                    <td>
                      <Address value={r.address ?? r.addressInput} redacted={r.addressRedacted} />
                    </td>
                    <td className="text-right">{r.amount ? <Money units={r.amount} decimals={assetDecimals} /> : <span className="text-danger tnum">{r.amountInput || "—"}</span>}</td>
                    <td className="mono-data text-ink-soft">{r.reference ?? "—"}</td>
                    <td>
                      {!r.valid ? (
                        <StatusBadge tone="danger">Invalid</StatusBadge>
                      ) : showExecution ? (
                        <StatusBadge status={r.status} />
                      ) : r.route ? (
                        r.route.status === "QUOTED" ? (
                          <span className="inline-flex flex-col">
                            <StatusBadge status="ROUTED">{r.route.routeKind === "direct_transfer" ? "Direct transfer" : r.route.routeKind === "swap" ? "Swap route" : "Cross-chain route"}</StatusBadge>
                            <span className="mt-1 text-[0.75rem] text-ink-faint">est. fee {r.route.feeTotalUsd ? `$${Number(r.route.feeTotalUsd).toFixed(4)}` : "—"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex flex-col">
                            <StatusBadge status={r.route.status === "UNAVAILABLE" ? "ROUTE_UNAVAILABLE" : r.route.status} />
                            {r.route.error && <span className="mt-1 max-w-[16rem] text-[0.75rem] text-danger">{r.route.error}</span>}
                          </span>
                        )
                      ) : (
                        <StatusBadge tone="success">Valid</StatusBadge>
                      )}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <RowActions r={r} editable={editable} showExecution={showExecution} canRetry={canRetry} busy={busy} onEdit={() => setEditing(r)} onRemove={() => setRemoving(r)} onRetry={() => retry(r.id)} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && onUpdate && <EditDialog r={editing} onClose={() => setEditing(null)} onSave={async (patch) => { await onUpdate(editing.id, patch); setEditing(null); }} />}
      {removing && onRemove && (
        <Dialog open onClose={() => setRemoving(null)} title={`Remove row ${removing.rowNumber}?`} footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Keep</Button><Button variant="danger" onClick={async () => { await onRemove(removing.id); setRemoving(null); }}>Remove row</Button></>}>
          <p className="text-[0.9375rem] text-ink-soft">
            <strong className="text-ink">{removing.name || "Unnamed"}</strong> will be removed from this batch. Any active approval is invalidated because the recipient set changes.
          </p>
        </Dialog>
      )}
    </div>
  );
}

function RowIssues({ r, inline }: { r: RecipientDTO; inline?: boolean }) {
  if (!r.errors.length && !r.warnings.length && !r.lastError) return null;
  return (
    <ul className={`${inline ? "mt-0.5" : "mt-2"} space-y-0.5 text-[0.75rem]`}>
      {r.errors.map((e, i) => (
        <li key={i} className="text-danger">
          {e.message}
        </li>
      ))}
      {r.warnings.map((w, i) => (
        <li key={i} className="flex items-center gap-1 text-warning">
          <IconWarn className="h-3 w-3" /> {w.message}
        </li>
      ))}
      {r.lastError && r.valid && <li className="text-danger">{r.lastError}</li>}
    </ul>
  );
}

function RowActions({ r, editable, showExecution, canRetry, busy, onEdit, onRemove, onRetry, compact }: { r: RecipientDTO; editable: boolean; showExecution: boolean; canRetry?: boolean; busy: string | null; onEdit: () => void; onRemove: () => void; onRetry: () => void; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-1 ${compact ? "justify-end" : "mt-3"}`}>
      {showExecution && (
        <Link href={`/app/payments/${r.id}`} className="btn btn-ghost btn-sm">
          Details
        </Link>
      )}
      {showExecution && canRetry && r.status === "RETRY_ELIGIBLE" && (
        <Button size="sm" variant="secondary" loading={busy === r.id} onClick={onRetry}>
          Retry
        </Button>
      )}
      {editable && (
        <>
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove} className="!text-danger">
            Remove
          </Button>
        </>
      )}
    </div>
  );
}

function EditDialog({ r, onClose, onSave }: { r: RecipientDTO; onClose: () => void; onSave: (patch: { name: string; address: string; amount: string; reference: string | null }) => Promise<void> }) {
  const [f, setF] = useState({ name: r.name, address: r.addressInput, amount: r.amountInput, reference: r.reference ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const err = (field: string) => r.errors.find((e) => e.field === field)?.message ?? null;
  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await onSave({ ...f, reference: f.reference || null });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open onClose={onClose} title={`Edit row ${r.rowNumber}`} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} onClick={save}>Save and re-validate</Button></>}>
      <div className="space-y-4">
        <Input label="Contractor name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} error={err("name")} />
        <Input label="Wallet address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} error={err("address")} className="font-mono" spellCheck={false} />
        <Input label={`Amount (${r.assetSymbol})`} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} error={err("amount")} />
        <Input label="Internal reference" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} />
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <p className="text-[0.8125rem] text-ink-faint">Changing the address or amount invalidates any active approval and the row&rsquo;s route.</p>
      </div>
    </Dialog>
  );
}
