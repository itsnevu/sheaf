"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PageHeader from "@/components/app/PageHeader";
import ActivityFeed from "@/components/app/ActivityFeed";
import BatchStepper, { reachedStep } from "@/components/app/BatchStepper";
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

const PRE_EXECUTION = ["DRAFT", "VALIDATED", "ROUTES_PREPARED", "APPROVED"];

export default function BatchPage() {
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
  // Auto-advance when the server moves ahead (e.g. routes prepared) and the user is on the previous step.
  useEffect(() => {
    if (step !== null && reached > step && (step === 3 || step === 2)) setStep(reached);
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

  const pre = PRE_EXECUTION.includes(batch.status);
  const editable = d.canEdit && pre;
  const activeApproval = d.approvals.find((a) => a.status === "ACTIVE");
  const canApproveNow = me.can("batch.approve") && batch.status === "ROUTES_PREPARED" && d.summary.routeUnavailable === 0;
  const routing = batch.status === "VALIDATED" && d.recipients.some((r) => r.valid && !r.route) && d.events[0]?.action === "routes.requested";

  const importCsv = (file: { fileName: string; text: string }) =>
    act("csv", async () => {
      const res = await api<{ fileErrors: Array<{ message: string }>; validCount: number; invalidCount: number }>(`/api/batches/${id}/csv`, { method: "POST", json: file });
      if (res.fileErrors.length) throw new Error(res.fileErrors[0].message);
      toast(`Imported ${res.validCount + res.invalidCount} rows`, { tone: res.invalidCount ? "warning" : "success", detail: res.invalidCount ? `${res.invalidCount} need correction` : "All rows valid" });
      setStep(2);
    });

  return (
    <>
      <PageHeader
        back={{ href: "/app/batches", label: "Batches" }}
        eyebrow={`Batch · ${batch.mode === "demo" ? "demo" : "real"} · ${batch.assetSymbol} on ${chainName(batch.destinationChainId)}`}
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            {batch.name} <StatusBadge status={batch.status} />
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="mono-data inline-flex items-center gap-1">
              {batch.id} <CopyButton value={batch.id} label="Copy batch id" size="xs" />
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
                Cancel batch
              </Button>
            )}
          </>
        }
      />

      {pre ? (
        <div className="space-y-6">
          <BatchStepper current={step ?? reached} reached={reached} onSelect={setStep} />

          {/* Step 0: details */}
          {(step ?? reached) === 0 && (
            <DetailsStep batch={batch} editable={editable} onSave={(patch) => act("details", () => api(`/api/batches/${id}`, { method: "PATCH", json: patch }), "Details saved")} onNext={() => setStep(1)} />
          )}

          {/* Step 1: upload */}
          {(step ?? reached) === 1 && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="title-2">Upload the contractor CSV</h2>
                  <p className="text-[0.875rem] text-ink-soft">{batch.csvFileName ? `Current file: ${batch.csvFileName}. Uploading a new file replaces every row and invalidates approvals.` : "Required columns: name, address, amount. Optional: asset, reference."}</p>
                </div>
                <a href={`/api/template?asset=${batch.assetSymbol}`} className="btn btn-secondary btn-sm">
                  Download template
                </a>
              </div>
              {editable ? <CsvUpload assetSymbol={batch.assetSymbol} assetDecimals={batch.assetDecimals} onImport={importCsv} /> : <p className="text-[0.875rem] text-ink-faint">Your role cannot upload recipients.</p>}
              {batch.csvFileName && (
                <div className="flex justify-end">
                  <Button variant="secondary" onClick={() => setStep(2)}>
                    Continue to validation <IconArrow />
                  </Button>
                </div>
              )}
            </section>
          )}

          {/* Step 2: validate */}
          {(step ?? reached) === 2 && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="title-2">Validation</h2>
                  <p className="text-[0.875rem] text-ink-soft">
                    <strong className={batch.validCount ? "text-success" : ""}>{batch.validCount} valid</strong> · <strong className={batch.invalidCount ? "text-danger" : ""}>{batch.invalidCount} invalid</strong> · total <Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium text-ink" />
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)}>
                    Replace CSV
                  </Button>
                  <Button variant="primary" disabled={batch.invalidCount > 0 || batch.validCount === 0} onClick={() => setStep(3)}>
                    Continue to routes <IconArrow />
                  </Button>
                </div>
              </div>
              {batch.invalidCount > 0 && (
                <p className="rounded-card border border-danger/30 bg-danger-tint px-4 py-3 text-[0.875rem] text-danger" role="alert">
                  {batch.invalidCount} row(s) block progress. Edit or remove each one; the batch re-validates automatically.
                </p>
              )}
              {d.recipients.length === 0 ? (
                <p className="text-[0.875rem] text-ink-faint">No rows imported yet.</p>
              ) : (
                <RecipientTable recipients={d.recipients} assetDecimals={batch.assetDecimals} assetSymbol={batch.assetSymbol} editable={editable} showExecution={false} onUpdate={(rid, patch) => act(`row:${rid}`, () => api(`/api/batches/${id}/recipients/${rid}`, { method: "PATCH", json: patch }), "Row updated")} onRemove={(rid) => act(`rm:${rid}`, () => api(`/api/batches/${id}/recipients/${rid}`, { method: "DELETE" }), "Row removed")} />
              )}
            </section>
          )}

          {/* Step 3: routes */}
          {(step ?? reached) === 3 && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="title-2">Route preparation</h2>
                  <p className="text-[0.875rem] text-ink-soft">One route and fee quote per recipient. {batch.mode === "demo" ? "Simulated provider." : "Quoted live from Relay; public rate limits apply."}</p>
                </div>
                <div className="flex gap-2">
                  {me.can("batch.prepare") && (
                    <Button variant={d.summary.routed === d.summary.valid && d.summary.valid > 0 ? "secondary" : "primary"} loading={busy === "routes" || routing} onClick={() => act("routes", () => api(`/api/batches/${id}/routes`, { method: "POST" }), "Route preparation started")}>
                      {d.summary.routed === d.summary.valid && d.summary.valid > 0 ? "Re-prepare routes" : "Prepare routes"}
                    </Button>
                  )}
                  <Button variant="primary" disabled={batch.status !== "ROUTES_PREPARED" && batch.status !== "APPROVED"} onClick={() => setStep(4)}>
                    Continue to review <IconArrow />
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
              <RecipientTable recipients={d.recipients.filter((r) => r.valid)} assetDecimals={batch.assetDecimals} assetSymbol={batch.assetSymbol} editable={editable} showExecution={false} onUpdate={(rid, patch) => act(`row:${rid}`, () => api(`/api/batches/${id}/recipients/${rid}`, { method: "PATCH", json: patch }), "Row updated")} onRemove={(rid) => act(`rm:${rid}`, () => api(`/api/batches/${id}/recipients/${rid}`, { method: "DELETE" }), "Row removed")} />
            </section>
          )}

          {/* Step 4: review */}
          {(step ?? reached) === 4 && (
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="title-2">Review before approval</h2>
                  <p className="text-[0.875rem] text-ink-soft">Estimates are labelled. Approval binds to the exact recipient set below.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(3)}>
                    Back to routes
                  </Button>
                  <Button variant="primary" onClick={() => setStep(5)}>
                    Continue to approval <IconArrow />
                  </Button>
                </div>
              </div>
              <ReviewPanel d={d} />
            </section>
          )}

          {/* Step 5: approve */}
          {(step ?? reached) === 5 && (
            <section className="space-y-4">
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
                      <div className="mt-1 mono-data text-ink-faint">set hash {activeApproval.recipientSetHash.slice(0, 20)}…</div>
                    </div>
                    {me.can("batch.approve") && (
                      <Button variant="ghost" className="!text-danger" onClick={() => act("revoke", () => api(`/api/batches/${id}/approve?reason=${encodeURIComponent("Revoked by approver")}`, { method: "DELETE" }), "Approval revoked")}>
                        Revoke approval
                      </Button>
                    )}
                  </div>
                  <p className="mt-4 text-[0.875rem] text-ink-soft">Next: funding and execution below.</p>
                </div>
              ) : (
                <div className="card p-5">
                  <p className="text-[0.9375rem] text-ink-soft">
                    An <strong>Approver</strong> or <strong>Owner</strong> who did not last edit the recipients must approve the exact set of {batch.validCount} recipients totalling <Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium text-ink" />.
                  </p>
                  {batch.status !== "ROUTES_PREPARED" && <p className="mt-2 text-[0.875rem] text-warning">Routes must be prepared and fresh before approval.</p>}
                  {canApproveNow ? (
                    <Button variant="accent" className="mt-4" onClick={() => setApproveOpen(true)}>
                      Approve this batch
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
            </section>
          )}

          {/* Funding lives under approval so the flow reads top to bottom */}
          {batch.status === "APPROVED" && (step ?? reached) === 5 && (
            <ExecutionPanel d={d} onFund={(input) => act("fund", () => api(`/api/batches/${id}/fund`, { method: "POST", json: input ?? {} }), "Funding recorded")} onExecute={() => act("exec", () => api(`/api/batches/${id}/execute`, { method: "POST" }), "Execution started")} onRefresh={refresh} />
          )}
        </div>
      ) : (
        /* ─────────── Execution / post-execution view ─────────── */
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6 min-w-0">
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile k="Recipients" v={String(batch.validCount)} />
              <Tile k="Total" v={<Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} />} />
              <Tile k="Est. fees" v={d.summary.feeEstimateUsd ? `$${Number(d.summary.feeEstimateUsd).toFixed(2)}` : "—"} sub="estimate" />
              <Tile k="Approved by" v={activeApproval?.approverEmail ?? d.approvals[0]?.approverEmail ?? "—"} sub={fmtDate(batch.approvedAt)} />
            </dl>
            {batch.status !== "CANCELLED" && (
              <ExecutionPanel d={d} onFund={(input) => act("fund", () => api(`/api/batches/${id}/fund`, { method: "POST", json: input ?? {} }), "Funding recorded")} onExecute={() => act("exec", () => api(`/api/batches/${id}/execute`, { method: "POST" }), "Execution started")} onRefresh={refresh} />
            )}
            <section>
              <h2 className="title-2 mb-3">Payments</h2>
              <RecipientTable recipients={d.recipients.filter((r) => r.valid)} assetDecimals={batch.assetDecimals} assetSymbol={batch.assetSymbol} editable={false} showExecution canRetry={me.can("payment.retry")} onRetry={(rid) => act(`retry:${rid}`, () => api(`/api/payments/${rid}/retry`, { method: "POST" }), "Retry queued")} />
            </section>
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
      )}

      {/* Timeline for pre-execution states, below the wizard */}
      {pre && (
        <section className="card mt-8 p-5">
          <h2 className="title-2">Timeline</h2>
          <div className="mt-2">
            <ActivityFeed events={d.events.slice(0, 12)} showBatch={false} compact />
          </div>
        </section>
      )}

      {/* Approve dialog */}
      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve batch" footer={<><Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button><Button variant="accent" loading={busy === "approve"} onClick={() => act("approve", () => api(`/api/batches/${id}/approve`, { method: "POST", json: { note } }), "Batch approved").then(() => setApproveOpen(false)).catch(() => {})}>Approve {batch.validCount} payments</Button></>}>
        <div className="space-y-4 text-[0.9375rem] text-ink-soft">
          <p>
            You are approving <strong className="text-ink">{batch.validCount}</strong> payments totalling <Money units={batch.totalAmount} decimals={batch.assetDecimals} symbol={batch.assetSymbol} className="font-medium text-ink" /> plus estimated fees of {d.summary.feeEstimateUsd ? `$${Number(d.summary.feeEstimateUsd).toFixed(2)}` : "an unavailable amount"}.
          </p>
          <p className="mono-data text-ink-faint">recipient set {batch.recipientSetHash}</p>
          <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Checked against the contractor register." />
          <p className="text-[0.8125rem]">Any later change to a recipient, amount or route invalidates this approval.</p>
        </div>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this batch?" footer={<><Button variant="ghost" onClick={() => setCancelOpen(false)}>Keep batch</Button><Button variant="danger" loading={busy === "cancel"} onClick={() => act("cancel", () => api(`/api/batches/${id}?reason=${encodeURIComponent("Cancelled from batch page")}`, { method: "DELETE" }), "Batch cancelled").then(() => router.push("/app/batches")).catch(() => {})}>Cancel batch</Button></>}>
        <p className="text-[0.9375rem] text-ink-soft">The batch is kept for audit but can no longer be prepared, approved or executed. Nothing has been sent.</p>
      </Dialog>
    </>
  );
}

function Tile({ k, v, sub }: { k: string; v: React.ReactNode; sub?: string }) {
  return (
    <div className="card px-4 py-3">
      <dt className="eyebrow">{k}</dt>
      <dd className="mt-1 truncate font-display text-[1.125rem] font-medium tnum">{v}</dd>
      {sub && <dd className="text-[0.75rem] text-ink-faint">{sub}</dd>}
    </div>
  );
}

function DetailsStep({ batch, editable, onSave, onNext }: { batch: { name: string; reference: string | null; deadlineAt: string | null; jitterMaxSeconds: number; csvFileName: string | null }; editable: boolean; onSave: (p: { name: string; reference: string | null; deadlineAt: string | null; jitterMaxSeconds: number }) => Promise<unknown>; onNext: () => void }) {
  const [name, setName] = useState(batch.name);
  const [reference, setReference] = useState(batch.reference ?? "");
  const [deadline, setDeadline] = useState(batch.deadlineAt ? new Date(batch.deadlineAt).toISOString().slice(0, 16) : "");
  const [jitter, setJitter] = useState(String(Math.round(batch.jitterMaxSeconds / 60)));
  const [busy, setBusy] = useState(false);
  const dirty = name !== batch.name || reference !== (batch.reference ?? "") || (deadline ? new Date(deadline).toISOString() : null) !== batch.deadlineAt || Number(jitter) * 60 !== batch.jitterMaxSeconds;
  return (
    <section className="card max-w-xl p-6 space-y-4">
      <h2 className="title-2">Batch details</h2>
      <Input label="Batch name" value={name} onChange={(e) => setName(e.target.value)} disabled={!editable} />
      <Input label="Internal reference" value={reference} onChange={(e) => setReference(e.target.value)} disabled={!editable} />
      <Input label="Deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} disabled={!editable} help="Execution is never scheduled past this time." />
      <Input label="Maximum spacing between submissions (minutes)" type="number" min={0} max={30} value={jitter} onChange={(e) => setJitter(e.target.value)} disabled={!editable} help="Operational spacing only; not a privacy guarantee." />
      <div className="flex gap-2 pt-2">
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
        <Button variant="primary" onClick={onNext}>
          {batch.csvFileName ? "Continue" : "Continue to upload"} <IconArrow />
        </Button>
      </div>
    </section>
  );
}
