"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/app/PageHeader";
import ActivityFeed, { type FeedEvent } from "@/components/app/ActivityFeed";
import { useMe } from "@/components/app/AppShell";
import { Address, Button, Money, Skeleton, StatusBadge, TxHash } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, fmtDate } from "@/lib/client";
import { chainName, txUrl } from "@/lib/config";
import { toDisplayUsd } from "@/lib/money";
import type { BatchDTO, RecipientDTO } from "@/lib/serialize";

interface Detail {
  payment: RecipientDTO;
  batch: BatchDTO;
  events: FeedEvent[];
}

export default function PaymentPage() {
  const { rid } = useParams<{ rid: string }>();
  const me = useMe();
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery({ queryKey: ["payment", rid], queryFn: () => api<Detail>(`/api/payments/${rid}`), refetchInterval: (query) => (["SCHEDULED", "SUBMITTED", "CONFIRMING"].includes(query.state.data?.payment.status ?? "") ? 2500 : 15000) });
  if (q.isLoading || !q.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64" />
        {q.error && <p className="error-text">{(q.error as Error).message}</p>}
      </div>
    );
  }
  const { payment: p, batch, events } = q.data;
  const fees = p.route?.fees as Record<string, { symbol: string; amountFormatted: string; amountUsd: string | null } | null> | undefined;
  const confirmed = p.attempts?.find((a) => a.status === "CONFIRMED");
  const last = p.attempts?.[p.attempts.length - 1];
  const tx = confirmed?.txHash ?? last?.txHash ?? null;
  const simulated = batch.mode === "demo";
  const retry = async () => {
    try {
      await api(`/api/payments/${rid}/retry`, { method: "POST" });
      toast("Retry queued", { tone: "success" });
      qc.invalidateQueries({ queryKey: ["payment", rid] });
    } catch (e) {
      toast((e as Error).message, { tone: "danger" });
    }
  };

  return (
    <>
      <PageHeader
        back={{ href: `/app/batches/${batch.id}`, label: batch.name }}
        eyebrow={`Payment · row ${p.rowNumber} · ${simulated ? "demo" : "real"}`}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {p.name} <StatusBadge status={p.status} />
          </span>
        }
        actions={me.can("payment.retry") && p.status === "RETRY_ELIGIBLE" && <Button variant="primary" onClick={retry}>Retry payment</Button>}
      />
      {p.lastError && (
        <p className="mb-5 rounded-card border border-danger/30 bg-danger-tint px-4 py-3 text-[0.875rem] text-danger" role="alert">
          {p.lastError}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6 min-w-0">
          <section className="card">
            <h2 className="title-2 border-b border-line px-5 py-3.5">Payment</h2>
            <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              <Kv k="Destination address" v={<Address value={p.address} redacted={p.addressRedacted} full={!p.addressRedacted} className="break-all" />} />
              <Kv k="Amount" v={<Money units={p.amount} decimals={batch.assetDecimals} symbol={p.assetSymbol} className="font-medium" />} />
              <Kv k="Asset · network" v={`${p.assetSymbol} · ${chainName(batch.destinationChainId)}`} />
              <Kv k="Internal reference" v={p.reference ?? "—"} mono />
              <Kv k="Batch" v={<Link href={`/app/batches/${batch.id}`} className="link">{batch.name}</Link>} />
              <Kv k="Transaction reference" v={<TxHash value={tx} url={tx ? txUrl(batch.destinationChainId, tx) : null} simulated={simulated} />} />
              <Kv k="Submitted" v={fmtDate(p.submittedAt)} />
              <Kv k="Completed" v={fmtDate(p.completedAt)} />
              <Kv k="Attempts" v={`${p.attemptCount}`} />
              <Kv k="Reconciliation" v={p.reconciliation ? <StatusBadge status={p.reconciliation.status} /> : <StatusBadge status="UNRECONCILED" />} />
            </dl>
          </section>

          <section className="card">
            <h2 className="title-2 border-b border-line px-5 py-3.5">Route</h2>
            {p.route ? (
              <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                <Kv k="Kind" v={p.route.routeKind === "direct_transfer" ? "Direct transfer (same chain, same asset)" : p.route.routeKind === "swap" ? "Swap route" : "Cross-chain route"} />
                <Kv k="Provider" v={`${p.route.provider}${simulated ? " (simulated)" : ""}`} />
                <Kv k="Provider request id" v={p.route.providerRequestId ?? "—"} mono />
                <Kv k="Route status" v={<StatusBadge status={p.route.status} />} />
                <Kv k="Quoted" v={fmtDate(p.route.quotedAt)} />
                <Kv k="Expires" v={fmtDate(p.route.expiresAt)} />
                <Kv k="Time estimate" v={p.route.timeEstimateSec ? `${p.route.timeEstimateSec}s` : "—"} />
                <Kv k="Origin amount" v={<Money units={p.route.amountIn} decimals={batch.assetDecimals} symbol={batch.assetSymbol} />} />
                {p.route.error && <Kv k="Error" v={<span className="text-danger">{p.route.error}</span>} />}
                <div className="sm:col-span-2">
                  <dt className="eyebrow">Fee breakdown (estimated at quote time)</dt>
                  <dd className="mt-1.5 overflow-hidden rounded-card border border-line">
                    <table className="table">
                      <tbody>
                        {fees &&
                          Object.entries(fees)
                            .filter(([k, v]) => k !== "totalUsd" && v && typeof v === "object")
                            .map(([k, v]) => (
                              <tr key={k}>
                                <td className="capitalize text-ink-soft">{k.replace(/([A-Z])/g, " $1")}</td>
                                <td className="tnum">
                                  {(v as { amountFormatted: string; symbol: string }).amountFormatted} {(v as { symbol: string }).symbol}
                                </td>
                                <td className="text-right tnum">{toDisplayUsd((v as { amountUsd: string | null }).amountUsd)}</td>
                              </tr>
                            ))}
                        <tr>
                          <td className="font-medium">Total (est.)</td>
                          <td />
                          <td className="text-right font-medium tnum">{toDisplayUsd(p.route.feeTotalUsd)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="eyebrow">Steps</dt>
                  <dd className="mt-1.5 space-y-1 text-[0.875rem]">
                    {p.route.steps.map((s, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <span className="badge badge-neutral">{s.id}</span>
                        <span>{s.description}</span>
                        <span className="text-ink-faint">· {chainName(s.chainId)}</span>
                        {s.to && <span className="mono-data text-ink-faint">→ {s.to.slice(0, 10)}…</span>}
                      </div>
                    ))}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="p-5 text-[0.875rem] text-ink-faint">No route has been prepared for this recipient.</p>
            )}
          </section>

          <section className="card">
            <h2 className="title-2 border-b border-line px-5 py-3.5">Execution attempts</h2>
            {p.attempts && p.attempts.length ? (
              <ul className="divide-y divide-line">
                {p.attempts.map((a) => (
                  <li key={a.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">Attempt {a.attemptNo}</span>
                      <StatusBadge status={a.status} />
                      {a.simulated && <span className="badge badge-warning">simulated</span>}
                      {a.failReason && <span className="mono-data text-danger">{a.failReason}</span>}
                      {a.retryable && a.status === "FAILED" && <span className="text-[0.75rem] text-ink-faint">provider says retryable</span>}
                    </div>
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-[0.8125rem] sm:grid-cols-2">
                      <Kv k="Reference" v={<TxHash value={a.txHash} url={a.txHash ? txUrl(batch.destinationChainId, a.txHash) : null} simulated={a.simulated} />} small />
                      <Kv k="Provider status" v={a.providerStatus ?? "—"} small mono />
                      <Kv k="Started" v={fmtDate(a.startedAt)} small />
                      <Kv k="Finished" v={fmtDate(a.finishedAt)} small />
                    </dl>
                    <details className="mt-2 text-[0.75rem] text-ink-faint">
                      <summary className="cursor-pointer">Log ({a.log.length})</summary>
                      <ul className="mt-1 space-y-0.5 font-mono">
                        {a.log.map((l, i) => (
                          <li key={i}>
                            {new Date(l.at).toLocaleTimeString()} {l.event}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-5 text-[0.875rem] text-ink-faint">No execution attempts yet.</p>
            )}
          </section>
        </div>
        <aside className="card p-5 self-start">
          <h2 className="title-2">Timeline</h2>
          <div className="mt-2">
            <ActivityFeed events={events} showBatch={false} compact />
          </div>
        </aside>
      </div>
    </>
  );
}

function Kv({ k, v, mono, small }: { k: string; v: React.ReactNode; mono?: boolean; small?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="eyebrow">{k}</dt>
      <dd className={`mt-0.5 break-words ${mono ? "mono-data" : small ? "text-[0.8125rem]" : "text-[0.9375rem]"}`}>{v}</dd>
    </div>
  );
}
