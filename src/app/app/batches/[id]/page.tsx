"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import ActivityFeed from "@/components/app/ActivityFeed";
import BatchStepper, { STEP, reachedStep } from "@/components/app/BatchStepper";
import CsvUpload from "@/components/app/CsvUpload";
import ExecutionPanel from "@/components/app/ExecutionPanel";
import RecipientTable from "@/components/app/RecipientTable";
import ReviewPanel from "@/components/app/ReviewPanel";
import { useMe } from "@/components/app/AppShell";
import { useBatch } from "@/components/app/useBatch";
import { Button, Dialog, Input, Money, Skeleton, StatusBadge, Textarea, IconArrow, CopyButton } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, downloadUrl, fmtDate } from "@/lib/client";
import { chainName } from "@/lib/config";
import { LEG_CSV_HEADER } from "@/lib/csv/validate";
import { OPERATION_KIND_INFO, operationKindLabel, type OperationKind } from "@/lib/domain/states";

/** Statuses in which the operation is still being prepared (stages Legs → Fund). */
const PRE_EXECUTION = ["DRAFT", "VALIDATED", "ROUTES_PREPARED", "APPROVED"];

export default function OperationPage() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const router = useRouter();
  const { toast } = useToast();
  const { data: d, isLoading, error, refresh } = useBatch(id);
  const [step, setStep] = useState<number | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const batch = d?.batch;
  const reached = batch ? reachedStep(batch.status, !!batch.csvFileName, batch.invalidCount, batch.validCount) : 0;
  useEffect(() => {
    if (batch && step === null) setStep(reached);
  }, [batch, reached, step]);
  // Auto-advance when the server moves ahead (validated, routes prepared, approved) and the
  // operator is still on the previous stage.
  useEffect(() => {
    if (step !== null && reached > step && step >= STEP.validate && step <= STEP.approve) setStep(reached);
  }, [reached, step]);

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => {
    setBusy(key);
    try {
      await fn();
      if (ok) toast(ok, { tone: "success" });
      refresh();
    } catch (e) {
      toast((e as Error).message, { tone: "danger" });
      throw e;
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || !d || !batch) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        {error && (
          <p className="error-text" role="alert">
            {(error as Error).message}
          </p>
        )}
      </div>
    );
  }

  const kind = batch.kind as OperationKind;
  const kindInfo = OPERATION_KIND_INFO[kind] ?? OPERATION_KIND_INFO.ACCUMULATE;
  const pre = PRE_EXECUTION.includes(batch.status);
  const editable = d.canEdit && pre;
  const activeApproval = d.approvals.find((a) => a.status === "ACTIVE");
  const canApproveNow = me.can("batch.approve") && batch.status === "ROUTES_PREPARED" && d.summary.routeUnavailable === 0;
  const routing = batch.status === "VALIDATED" && d.recipients.some((r) => r.valid && !r.route) && d.events[0]?.action === "routes.requested";
  const current = step ?? reached;

  const importCsv = (file: { fileName: string; text: string }) =>
    act("csv", async () => {
      const res = await api<{ fileErrors: Array<{ message: string }>; validCount: number; invalidCount: number }>(`/api/batches/${id}/csv`, { method: "POST", json: file });
      if (res.fileErrors.length) throw new Error(res.fileErrors[0].message);
      toast(`Imported ${res.validCount + res.invalidCount} legs`, { tone: res.invalidCount ? "warning" : "success", detail: res.invalidCount ? `${res.invalidCount} need correction` : "All legs valid" });
      setStep(STEP.validate);
    });

  const legTable = (rows: typeof d.recipients, opts: { execution: boolean }) => (
    <RecipientTable
      recipients={rows}
      assetDecimals={batch.assetDecimals}
      assetSymbol={batch.assetSymbol}
      kind={kind}
      editable={opts.execution ? false : editable}
      showExecution={opts.execution}
      canRetry={opts.execution ? me.can("payment.retry") : undefined}
      onRetry={opts.execution ? (rid) => act(`retry:${rid}`, () => api(`/api/payments/${rid}/retry`, { method: "POST" }), "Retry queued") : undefined}
      onUpdate={opts.execution ? undefined : (rid, patch) => act(`row:${rid}`, () => api(`/api/batches/${id}/recipients/${rid}`, { method: "PATCH", json: patch }), "Leg updated")}
      onRemove={opts.execution ? undefined : (rid) => act(`rm:${rid}`, () => api(`/api/batches/${id}/recipients/${rid}`, { method: "DELETE" }), "Leg removed")}
    />
  );

  const executionPanel = <ExecutionPanel d={d} onFund={(input) => act("fund", () => api(`/api/batches/${id}/fund`, { method: "POST", json: input ?? {} }), "Funding recorded")} onExecute={() => act("exec", () => api(`/api/batches/${id}/execute`, { method: "POST" }), "Execution started")} onRefresh={refresh} />;

  return (
    <>
      <PageHeader
        back={{ href: "/app/batches", label: "Operations" }}
        eyebrow={`${operationKindLabel(kind)} · ${kindInfo.contract} · ${batch.mode === "demo" ? "demo" : "real"} · ${batch.assetSymbol} on ${chainName(batch.destinationChainId)}`}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {batch.name} <StatusBadge status={batch.status} testId="batch-status" />
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="mono-data inline-flex items-center gap-1">
              {batch.id} <CopyButton value={batch.id} label="Copy operation id" size="xs" />
            </span>
            {batch.reference && <span>ref {batch.reference}</span>}
            <span>created {fmtDate(batch.createdAt)}</span>
            {batch.deadlineAt && <span>deadline {fmtDate(batch.deadlineAt)}</span>}
          </span>
        }
        actions={
          <>
            {me.can("export.download") && !pre && (
              <Button variant="secondary" onClick={() => downloadUrl(`/api/export?batchId=${id}`)}>
                Export CSV
              </Button>
            )}
            {me.can("csv.viewOriginal") && batch.csvFileName && (
              <Button variant="ghost" onClick={() => downloadUrl(`/api/batches/${id}/csv`)}>
                Original CSV
              </Button>
            )}
            {d.canEdit && ["DRAFT", "VALIDATED", "ROUTES_PREPARED", "APPROVED", "FUNDED"].includes(batch.status) && (
              <Button variant="ghost" className="!text-danger" onClick={() => setCancelOpen(true)}>
                Cancel operation
              </Button>
            )}
          </>
        }
      />

      {pre ? (
        <div className="space-y-6">
          <BatchStepper current={current} reached={reached} onSelect={setStep} interactiveUpTo={STEP.fund} />

          {/* Stage 1: legs (details + import) */}
          {current === STEP.legs && (
            <section className="space-y-6">
              <DetailsCard batch={batch} kindInfo={kindInfo} editable={editable} onSave={(patch) => act("details", () => api(`/api/batches/${id}`, { method: "PATCH", json: patch }), "Details saved")} />
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="title-2">Add the legs</h2>
                    <p className="text-[0.875rem] text-ink-soft">
                      {batch.csvFileName ? `Current file: ${batch.csvFileName}. Uploading a new file replaces every leg and invalidates approvals.` : `${kindInfo.legs} CSV columns: ${LEG_CSV_HEADER}.`}
                    </p>
                  </div>
                  <a href={`/api/template?asset=${batch.assetSymbol}`} className="btn btn-secondary btn-sm">
                    Download template
                  </a>
                </div>
                {editable ? <CsvUpload assetSymbol={batch.assetSymbol} assetDecimals={batch.assetDecimals} onImport={importCsv} /> : <p className="text-[0.875rem] text-ink-faint">Your role cannot add legs.</p>}
                {batch.csvFileName && (
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={() => setStep(STEP.validate)}>
                      Continue to validation <IconArrow />
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Stage 2: validate */}
          {current === STEP.validate && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="title-2">Validation</h2>
                  <p className="text-[0.875rem] text-ink-soft">
                    <strong className={batch.validCount ? "text-success" : ""}>{batch.validCount} valid</strong> · <strong className={batch.invalidCount ? "text-danger" : ""}>{batch.invalidCount} invalid</strong> · total <Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium text-ink" />
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(STEP.legs)}>
                    Replace legs
                  </Button>
                  <Button variant="primary" disabled={batch.invalidCount > 0 || batch.validCount === 0} onClick={() => setStep(STEP.route)}>
                    Continue to routes <IconArrow />
                  </Button>
                </div>
              </div>
              {batch.invalidCount > 0 && (
                <p className="rounded-card border border-danger/30 bg-danger-tint px-4 py-3 text-[0.875rem] text-danger" role="alert">
                  {batch.invalidCount} leg(s) block progress. Edit or remove each one; the operation re-validates automatically.
                </p>
              )}
              {d.recipients.length === 0 ? <p className="text-[0.875rem] text-ink-faint">No legs imported yet.</p> : legTable(d.recipients, { execution: false })}
            </section>
          )}

          {/* Stage 3: route */}
          {current === STEP.route && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="title-2">Route preparation</h2>
                  <p className="text-[0.875rem] text-ink-soft">One route and fee quote per leg. {batch.mode === "demo" ? "Simulated provider." : "Quoted live from Relay into Robinhood Chain; public rate limits apply."}</p>
                </div>
                <div className="flex gap-2">
                  {me.can("batch.prepare") && (
                    <Button variant={d.summary.routed === d.summary.valid && d.summary.valid > 0 ? "secondary" : "primary"} loading={busy === "routes" || routing} onClick={() => act("routes", () => api(`/api/batches/${id}/routes`, { method: "POST" }), "Route preparation started")}>
                      {d.summary.routed === d.summary.valid && d.summary.valid > 0 ? "Re-prepare routes" : "Prepare routes"}
                    </Button>
                  )}
                  <Button variant="primary" disabled={batch.status !== "ROUTES_PREPARED" && batch.status !== "APPROVED"} onClick={() => setStep(STEP.approve)}>
                    Continue to approval <IconArrow />
                  </Button>
                </div>
              </div>
              <div className="card p-4">
                <div className="flex items-center justify-between text-[0.875rem]">
                  <span className="text-ink-soft">
                    {d.summary.routed}/{d.summary.valid} routes ready{d.summary.routeUnavailable ? ` · ${d.summary.routeUnavailable} unavailable` : ""}
                  </span>
                  {routing && <span className="text-veil">Quoting…</span>}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-field">
                  <div className="h-full bg-veil transition-[width] duration-500" style={{ width: `${d.summary.valid ? Math.round(((d.summary.routed + d.summary.routeUnavailable) / d.summary.valid) * 100) : 0}%` }} />
                </div>
              </div>
              {legTable(d.recipients.filter((r) => r.valid), { execution: false })}
            </section>
          )}

          {/* Stage 4: approve (review + approval) */}
          {current === STEP.approve && (
            <section className="space-y-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="title-2">Review and approve</h2>
                    <p className="text-[0.875rem] text-ink-soft">Estimates are labelled. Approval binds to the exact leg set below.</p>
                  </div>
                  <Button variant="ghost" onClick={() => setStep(STEP.route)}>
                    Back to routes
                  </Button>
                </div>
                <ReviewPanel d={d} />
              </div>

              <div className="space-y-4">
                <h2 className="title-2">Approval</h2>
                {activeApproval ? (
                  <div className="card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <StatusBadge tone="success">Approved</StatusBadge>
                        <div className="mt-2 text-[0.9375rem]">
                          By <strong>{activeApproval.approverEmail}</strong> on {fmtDate(activeApproval.createdAt)} for <Money units={activeApproval.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium" />
                        </div>
                        {activeApproval.note && <div className="mt-1 text-[0.875rem] text-ink-soft">“{activeApproval.note}”</div>}
                        <div className="mt-1 mono-data text-ink-faint">leg set hash {activeApproval.recipientSetHash.slice(0, 20)}…</div>
                      </div>
                      <div className="flex gap-2">
                        {me.can("batch.approve") && (
                          <Button variant="ghost" className="!text-danger" onClick={() => act("revoke", () => api(`/api/batches/${id}/approve?reason=${encodeURIComponent("Revoked by approver")}`, { method: "DELETE" }), "Approval revoked")}>
                            Revoke approval
                          </Button>
                        )}
                        <Button variant="primary" onClick={() => setStep(STEP.fund)}>
                          Continue to funding <IconArrow />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card p-5">
                    <p className="text-[0.9375rem] text-ink-soft">
                      An <strong>Approver</strong> or <strong>Owner</strong> who did not last edit the legs must approve the exact set of {batch.validCount} legs totalling <Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium text-ink" />.
                      {kind === "TREASURY" && " Delegated treasury: the proposer is never the approver."}
                    </p>
                    {batch.status !== "ROUTES_PREPARED" && <p className="mt-2 text-[0.875rem] text-warning">Routes must be prepared and fresh before approval.</p>}
                    {canApproveNow ? (
                      <Button variant="accent" className="mt-4" onClick={() => setApproveOpen(true)}>
                        Approve this operation
                      </Button>
                    ) : (
                      <p className="mt-4 text-[0.8125rem] text-ink-faint">{me.can("batch.approve") ? "Approval is not possible yet." : "Your role cannot approve. Ask an approver to review."}</p>
                    )}
                  </div>
                )}
                {d.approvals.filter((a) => a.status !== "ACTIVE").length > 0 && (
                  <details className="text-[0.8125rem] text-ink-faint">
                    <summary className="cursor-pointer">Previous approvals</summary>
                    <ul className="mt-2 space-y-1">
                      {d.approvals
                        .filter((a) => a.status !== "ACTIVE")
                        .map((a) => (
                          <li key={a.id}>
                            {a.approverEmail} · {fmtDate(a.createdAt)} · invalidated {fmtDate(a.invalidatedAt)}: {a.invalidatedReason}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </div>
            </section>
          )}

          {/* Stage 5: fund */}
          {current === STEP.fund && (
            <section className="space-y-4">
              <div>
                <h2 className="title-2">Funding</h2>
                <p className="text-[0.875rem] text-ink-soft">{batch.status === "APPROVED" ? "The approved leg set is funded from the desk wallet. Execution starts after funding." : "Approval is required before funding."}</p>
              </div>
              {batch.status === "APPROVED" ? executionPanel : <p className="text-[0.8125rem] text-ink-faint">Nothing to fund yet.</p>}
            </section>
          )}
        </div>
      ) : (
        /* ─────────── Stages 6–7: execute and reconcile ─────────── */
        <div className="space-y-6">
          <BatchStepper current={reached} reached={reached} onSelect={() => undefined} interactiveUpTo={-1} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6 min-w-0">
              <dl className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-4">
                <Tile k="Legs" v={String(batch.validCount)} />
                <Tile k="Total" v={<Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} />} />
                <Tile k="Est. fees" v={d.summary.feeEstimateUsd ? `$${Number(d.summary.feeEstimateUsd).toFixed(2)}` : "—"} sub="estimate" />
                <Tile k="Approved by" v={activeApproval?.approverEmail ?? d.approvals[0]?.approverEmail ?? "—"} sub={fmtDate(batch.approvedAt)} />
              </dl>
              {batch.status !== "CANCELLED" && executionPanel}
              <section>
                <h2 className="title-2 mb-3">Legs</h2>
                {legTable(d.recipients.filter((r) => r.valid), { execution: true })}
              </section>
              {batch.status === "COMPLETED" && (
                <section className="card p-5">
                  <h2 className="title-2">Reconcile</h2>
                  <p className="mt-1 text-[0.875rem] text-ink-soft">Every leg settled. Match each one to its reference on the Reconciliation page; demo legs are always flagged as simulated.</p>
                  <Button href={`/app/reconciliation`} variant="secondary" className="mt-3">
                    Open reconciliation <IconArrow />
                  </Button>
                </section>
              )}
            </div>
            <aside className="space-y-6">
              <section className="card p-5">
                <h2 className="title-2">Timeline</h2>
                <div className="mt-2 max-h-[32rem] overflow-y-auto">
                  <ActivityFeed events={d.events} showBatch={false} compact />
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}

      {/* Timeline for pre-execution states, below the stages */}
      {pre && (
        <section className="card mt-8 p-5">
          <h2 className="title-2">Timeline</h2>
          <div className="mt-2">
            <ActivityFeed events={d.events.slice(0, 12)} showBatch={false} compact />
          </div>
        </section>
      )}

      {/* Approve dialog */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve operation" footer={<><Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button><Button variant="accent" loading={busy === "approve"} onClick={() => act("approve", () => api(`/api/batches/${id}/approve`, { method: "POST", json: { note } }), "Operation approved").then(() => setApproveOpen(false)).catch(() => {})}>Approve {batch.validCount} legs</Button></>}>
        <div className="space-y-4 text-[0.9375rem] text-ink-soft">
          <p>
            You are approving <strong className="text-ink">{batch.validCount}</strong> legs of a {operationKindLabel(kind).toLowerCase()} totalling <Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium text-ink" /> plus estimated fees of {d.summary.feeEstimateUsd ? `$${Number(d.summary.feeEstimateUsd).toFixed(2)}` : "an unavailable amount"}.
          </p>
          <p className="mono-data text-ink-faint">leg set {batch.recipientSetHash}</p>
          <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Checked against the desk plan." />
          <p className="text-[0.8125rem]">Any later change to a leg, amount or route invalidates this approval.</p>
        </div>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this operation?" footer={<><Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep operation</Button><Button variant="danger" loading={busy === "cancel"} onClick={() => act("cancel", () => api(`/api/batches/${id}?reason=${encodeURIComponent("Cancelled from operation page")}`, { method: "DELETE" }), "Operation cancelled").then(() => router.push("/app/batches")).catch(() => {})}>Cancel operation</Button></>}>
        <p className="text-[0.9375rem] text-ink-soft">The operation is kept for audit but can no longer be prepared, approved or executed. Nothing has been sent.</p>
      </Dialog>
    </>
  );
}

function Tile({ k, v, sub }: { k: string; v: React.ReactNode; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <dt className="eyebrow">{k}</dt>
      <dd className="mt-1 break-words font-display text-[1.125rem] font-medium tnum">{v}</dd>
      {sub && <dd className="text-[0.75rem] text-ink-faint">{sub}</dd>}
    </div>
  );
}

function DetailsCard({ batch, kindInfo, editable, onSave }: { batch: { name: string; kind: string; reference: string | null; deadlineAt: string | null; jitterMaxSeconds: number; csvFileName: string | null }; kindInfo: (typeof OPERATION_KIND_INFO)[OperationKind]; editable: boolean; onSave: (p: { name: string; reference: string | null; deadlineAt: string | null; jitterMaxSeconds: number }) => Promise<unknown> }) {
  const [name, setName] = useState(batch.name);
  const [reference, setReference] = useState(batch.reference ?? "");
  const [deadline, setDeadline] = useState(batch.deadlineAt ? new Date(batch.deadlineAt).toISOString().slice(0, 16) : "");
  const [jitter, setJitter] = useState(String(Math.round(batch.jitterMaxSeconds / 60)));
  const [busy, setBusy] = useState(false);
  const dirty = name !== batch.name || reference !== (batch.reference ?? "") || (deadline ? new Date(deadline).toISOString() : null) !== batch.deadlineAt || Number(jitter) * 60 !== batch.jitterMaxSeconds;
  return (
    <details className="card max-w-xl p-6" open={!batch.csvFileName}>
      <summary className="cursor-pointer">
        <span className="title-2">Operation details</span>
        <span className="ml-2 text-[0.8125rem] text-ink-faint">
          {kindInfo.label} · {kindInfo.contract}
        </span>
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-[0.8125rem] text-ink-soft">{kindInfo.summary}</p>
        <Input label="Operation name" value={name} onChange={(e) => setName(e.target.value)} disabled={!editable} />
        <Input label="Internal reference" value={reference} onChange={(e) => setReference(e.target.value)} disabled={!editable} />
        <Input label="Deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={!editable} help="No leg is scheduled past this time." />
        <Input label="Maximum spacing between legs (minutes)" type="number" min={0} max={30} value={jitter} onChange={(e) => setJitter(e.target.value)} disabled={!editable} help="Operational spacing only; a leg's not-before time always wins. Not a privacy guarantee." />
        {editable && (
          <Button
            variant="secondary"
            disabled={!dirty || !name.trim()}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onSave({ name, reference: reference || null, deadlineAt: deadline ? new Date(deadline).toISOString() : null, jitterMaxSeconds: Math.max(0, Number(jitter) || 0) * 60 });
              } finally {
                setBusy(false);
              }
            }}
          >
            Save details
          </Button>
        )}
      </div>
    </details>
  );
}
