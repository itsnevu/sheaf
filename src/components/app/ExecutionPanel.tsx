"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button, Dialog, Money, Progress, StatusBadge, TxHash } from "@/components/ui";
import { chainName, txUrl } from "@/lib/config";
import { fmtDate } from "@/lib/client";
import { useMe } from "./AppShell";
import type { BatchDetail } from "./useBatch";

const RealExecutionConsole = dynamic(() => import("./RealExecutionConsole"), { ssr: false, loading: () => <p className="text-[0.875rem] text-ink-faint">Loading wallet console…</p> });

interface Props {
  d: BatchDetail;
  onFund: (input?: { fromAddress: string; attestedBalance: string }) => Promise<void>;
  onExecute: () => Promise<void>;
  onRefresh: () => void;
}

export default function ExecutionPanel({ d, onFund, onExecute, onRefresh }: Props) {
  const me = useMe();
  const { batch, summary, funding } = d;
  const [confirmFund, setConfirmFund] = useState(false);
  const [confirmExec, setConfirmExec] = useState(false);
  const [busy, setBusy] = useState(false);
  const total = summary.valid;
  const done = summary.completed;
  const active = summary.inFlight;
  const isDemo = batch.mode === "demo";
  const activeFunding = funding[0];

  const run = async (fn: () => Promise<void>, close: () => void) => {
    setBusy(true);
    try {
      await fn();
      close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Funding */}
      {batch.status === "APPROVED" && (
        <section className="card p-5">
          <h3 className="title-2">Fund the batch</h3>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            Estimated funding requirement: <Money units={summary.fundingRequired} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium text-ink" /> on {chainName(batch.originChainId)} (plus native gas).
          </p>
          {isDemo ? (
            <>
              <p className="mt-2 text-[0.8125rem] text-warning">Demo mode: funding is recorded as a simulated event. No wallet, no transfer.</p>
              {me.can("batch.fund") && (
                <Button variant="primary" className="mt-4" onClick={() => setConfirmFund(true)}>
                  Record simulated funding
                </Button>
              )}
            </>
          ) : me.can("batch.fund") ? (
            <div className="mt-4">
              <RealExecutionConsole d={d} stage="fund" onFund={onFund} onRefresh={onRefresh} />
            </div>
          ) : (
            <p className="mt-3 text-[0.8125rem] text-ink-faint">A finance admin or owner must confirm funding.</p>
          )}
        </section>
      )}

      {/* Execute */}
      {(batch.status === "FUNDED" || batch.status === "PARTIALLY_FAILED" || batch.status === "FAILED") && (
        <section className="card p-5">
          <h3 className="title-2">{batch.status === "FUNDED" ? "Start execution" : "Resume execution"}</h3>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            {batch.status === "FUNDED"
              ? `${total} payment(s) will be queued, one job each, with idempotency keys. ${batch.jitterMaxSeconds ? `Submissions are spaced up to ${Math.round(batch.jitterMaxSeconds / 60)} minutes apart.` : ""}`
              : `${summary.retryEligible} retry-eligible payment(s) can be re-queued. Completed payments are untouched.`}
          </p>
          {me.can("batch.execute") ? (
            <Button variant="accent" className="mt-4" onClick={() => setConfirmExec(true)} disabled={batch.status !== "FUNDED" && summary.retryEligible === 0}>
              {isDemo ? "Execute (simulated)" : "Execute"}
            </Button>
          ) : (
            <p className="mt-3 text-[0.8125rem] text-ink-faint">A finance admin or owner starts execution.</p>
          )}
        </section>
      )}

      {/* Progress */}
      {["EXECUTING", "COMPLETED", "PARTIALLY_FAILED", "FAILED"].includes(batch.status) && (
        <section className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="title-2">Execution</h3>
            <StatusBadge status={batch.status} />
          </div>
          <div className="mt-4">
            <Progress value={done} max={total} label="Completed payments" tone={batch.status === "COMPLETED" ? "success" : "veil"} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-[0.875rem]">
            <Kv k="In flight" v={active} />
            <Kv k="Completed" v={done} />
            <Kv k="Retry eligible" v={summary.retryEligible} />
            <Kv k="Failed / refunded" v={summary.failed} />
          </dl>
          {!isDemo && batch.status === "EXECUTING" && me.can("batch.execute") && (
            <div className="mt-5 border-t border-line pt-5">
              <RealExecutionConsole d={d} stage="sign" onFund={onFund} onRefresh={onRefresh} />
            </div>
          )}
          {isDemo && batch.status === "EXECUTING" && <p className="mt-4 text-[0.8125rem] text-warning">Simulated execution in progress. Statuses advance on a fixed schedule; no chain activity.</p>}
        </section>
      )}

      {/* Funding records */}
      {funding.length > 0 && (
        <section className="card p-5">
          <h3 className="title-2">Funding</h3>
          <ul className="mt-3 divide-y divide-line text-[0.875rem]">
            {funding.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <StatusBadge status={f.status} />
                  <span className="ml-2 text-ink-soft">
                    <Money units={f.amount} decimals={batch.assetDecimals} symbol={f.assetSymbol} /> from <span className="mono-data">{f.fromAddress}</span>
                  </span>
                  {f.note && <div className="mt-0.5 text-[0.75rem] text-ink-faint">{f.note}</div>}
                </div>
                <div className="text-right text-[0.75rem] text-ink-faint">
                  {f.txHash && <TxHash value={f.txHash} url={txUrl(f.chainId, f.txHash)} simulated={f.simulated} />}
                  <div>{fmtDate(f.createdAt)}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={confirmFund} onClose={() => setConfirmFund(false)} title="Record simulated funding" footer={<><Button variant="ghost" onClick={() => setConfirmFund(false)}>Cancel</Button><Button variant="primary" loading={busy} onClick={() => run(() => onFund(), () => setConfirmFund(false))}>Record funding</Button></>}>
        <p className="text-[0.9375rem] text-ink-soft">This records a <strong className="text-ink">simulated</strong> funding event for <Money units={summary.fundingRequired} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="text-ink font-medium" />. No funds move. The batch becomes fundable-executed in demo mode only.</p>
      </Dialog>
      <Dialog open={confirmExec} onClose={() => setConfirmExec(false)} title={isDemo ? "Execute simulated batch?" : "Execute batch?"} footer={<><Button variant="ghost" onClick={() => setConfirmExec(false)}>Cancel</Button><Button variant="accent" loading={busy} onClick={() => run(onExecute, () => setConfirmExec(false))}>Confirm and execute</Button></>}>
        <p className="text-[0.9375rem] text-ink-soft">
          {isDemo ? "Payments will be simulated by the mock provider. Some rows may be scripted to fail so you can exercise retries." : "Each route will be presented for signature by the connected treasury wallet. Nothing is sent without your signature."} Approval hash <span className="mono-data">{batch.recipientSetHash?.slice(0, 16)}…</span> will be re-checked before anything starts.
        </p>
        {activeFunding && <p className="mt-3 text-[0.8125rem] text-ink-faint">Funding record: {activeFunding.status.toLowerCase()} · {fmtDate(activeFunding.createdAt)}</p>}
      </Dialog>
    </div>
  );
}

function Kv({ k, v }: { k: string; v: number }) {
  return (
    <div className="inset px-3 py-2">
      <dt className="eyebrow">{k}</dt>
      <dd className="mt-0.5 font-display text-[1.125rem] font-medium tnum">{v}</dd>
    </div>
  );
}
