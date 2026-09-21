import type { BatchRecipient, Job, PaymentBatch } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { KNOWN_ASSETS } from "@/lib/config";
import { providerFor } from "@/lib/providers";
import type { StatusResult } from "@/lib/providers/types";
import { TERMINAL_RECIPIENT } from "@/lib/domain/states";

/**
 * Job handlers. Every handler is idempotent: re-running it after a crash must not create a
 * second payment. Money-moving side effects happen only in execute_route (demo) or in the
 * browser (real); everything else is bookkeeping.
 */

const POLL_SCHEDULE_MS = [3000, 5000, 8000, 13000, 21000, 34000, 55000];
const MAX_POLLS = 60; // ~ 45 minutes with the schedule above
const MAX_UNKNOWN = 8; // consecutive unreachable status checks before we stop and flag

function log(entry: string, existing: string): string {
  const arr = JSON.parse(existing || "[]") as unknown[];
  arr.push({ at: new Date().toISOString(), event: entry });
  return JSON.stringify(arr.slice(-50));
}

/* ─────────────── prepare_routes ─────────────── */

export async function quoteRecipient(batch: PaymentBatch, r: BatchRecipient): Promise<boolean> {
  const org = await db.organization.findUniqueOrThrow({ where: { id: batch.organizationId } });
  const provider = providerFor(batch.mode as "demo" | "real");
  const originAsset = KNOWN_ASSETS[batch.originChainId]?.[batch.assetSymbol];
  const destAsset = KNOWN_ASSETS[batch.destinationChainId]?.[batch.assetSymbol];
  const user = org.treasuryAddress ?? "0x000000000000000000000000000000000000dEaD";
  if (!r.address || !r.amount) return false;
  const res = await provider.quote({
    user,
    recipient: r.address,
    originChainId: batch.originChainId,
    destinationChainId: batch.destinationChainId,
    originCurrency: originAsset?.address ?? batch.assetAddress ?? "0x0000000000000000000000000000000000000000",
    destinationCurrency: destAsset?.address ?? batch.assetAddress ?? "0x0000000000000000000000000000000000000000",
    amount: r.amount,
    refundTo: user,
    correlationKey: `${batch.id}:${r.id}`,
  });
  await db.paymentRoute.deleteMany({ where: { recipientId: r.id } });
  if (res.ok) {
    await db.paymentRoute.create({
      data: {
        recipientId: r.id,
        batchId: batch.id,
        provider: provider.name,
        providerRequestId: res.providerRequestId,
        routeKind: res.routeKind,
        originChainId: batch.originChainId,
        destinationChainId: batch.destinationChainId,
        steps: JSON.stringify(res.steps),
        fees: JSON.stringify(res.fees),
        feeTotalUsd: res.fees.totalUsd,
        amountIn: res.amountIn,
        timeEstimateSec: res.timeEstimateSec,
        expiresAt: res.expiresAt,
        status: "QUOTED",
        raw: res.raw ? JSON.stringify(res.raw).slice(0, 20_000) : null,
      },
    });
    await db.batchRecipient.update({ where: { id: r.id }, data: { status: "ROUTED", lastError: null } });
    return true;
  }
  await db.paymentRoute.create({
    data: { recipientId: r.id, batchId: batch.id, provider: provider.name, routeKind: "direct_transfer", originChainId: batch.originChainId, destinationChainId: batch.destinationChainId, status: "UNAVAILABLE", error: `${res.code}: ${res.message}` },
  });
  await db.batchRecipient.update({ where: { id: r.id }, data: { status: "ROUTE_UNAVAILABLE", lastError: `${res.code}: ${res.message}` } });
  return false;
}

export async function prepareRoutes(job: Job) {
  const batch = await db.paymentBatch.findUnique({ where: { id: job.batchId! } });
  if (!batch || !["VALIDATED", "ROUTES_PREPARED", "APPROVED"].includes(batch.status)) return;
  const pending = await db.batchRecipient.findMany({ where: { batchId: batch.id, valid: true, route: null }, orderBy: { rowNumber: "asc" } });
  // Public Relay limit is 50 quotes/min; keep a small concurrency and a gentle pace in real mode.
  const concurrency = batch.mode === "real" ? 2 : 6;
  const paceMs = batch.mode === "real" ? 1300 : 0;
  let i = 0;
  let unavailable = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (i < pending.length) {
        const r = pending[i++];
        const ok = await quoteRecipient(batch, r);
        if (!ok) unavailable++;
        if (paceMs) await new Promise((res) => setTimeout(res, paceMs));
      }
    }),
  );
  const rows = await db.batchRecipient.findMany({ where: { batchId: batch.id, valid: true }, include: { route: { select: { status: true } } } });
  const allQuoted = rows.length > 0 && rows.every((r) => r.route?.status === "QUOTED");
  await db.paymentBatch.update({ where: { id: batch.id }, data: { status: allQuoted ? "ROUTES_PREPARED" : "VALIDATED" } });
  await audit({ organizationId: batch.organizationId, batchId: batch.id, action: "routes.prepared", summary: allQuoted ? `Routes ready for all ${rows.length} recipients` : `Routes prepared: ${rows.length - unavailable - rows.filter((r) => !r.route).length} ready, ${rows.filter((r) => r.route?.status !== "QUOTED").length} unavailable`, payload: { total: rows.length, unavailable } });
}

/* ─────────────── execute_route (demo only) ─────────────── */

export async function executeRoute(job: Job) {
  const r = await db.batchRecipient.findUnique({ where: { id: job.recipientId! }, include: { batch: true, route: true, attempts: { orderBy: { attemptNo: "desc" }, take: 1 } } });
  if (!r || !r.route) return;
  if (r.batch.mode !== "demo") throw new Error("execute_route is only valid for demo batches");
  if (r.batch.status !== "EXECUTING") return; // cancelled or paused
  if (r.status !== "SCHEDULED") return; // already picked up or terminal
  const attemptNo = (JSON.parse(job.payload) as { attemptNo?: number }).attemptNo ?? r.attemptCount + 1;
  const key = `exec:${r.batchId}:${r.id}:${attemptNo}`;
  const last = r.attempts[0];
  if (last && ["PENDING", "SUBMITTED", "UNKNOWN"].includes(last.status)) return; // never double-send
  const existing = await db.executionAttempt.findUnique({ where: { idempotencyKey: key } });
  if (existing) return; // idempotent re-run after crash

  const provider = providerFor("demo");
  const attempt = await db.executionAttempt.create({
    data: { recipientId: r.id, batchId: r.batchId, attemptNo, idempotencyKey: key, provider: provider.name, providerRequestId: r.route.providerRequestId, status: "PENDING", simulated: true, log: log("submitting (simulated)", "[]") },
  });
  await db.batchRecipient.update({ where: { id: r.id }, data: { attemptCount: attemptNo } });
  try {
    const sub = await provider.submit({ providerRequestId: r.route.providerRequestId ?? "", idempotencyKey: key, recipient: r.address!, amount: r.amount! });
    await db.$transaction([
      db.executionAttempt.update({ where: { id: attempt.id }, data: { status: "SUBMITTED", providerRequestId: sub.providerRequestId, txHash: sub.txHash, log: log(`submitted ${sub.providerRequestId}`, attempt.log) } }),
      db.batchRecipient.update({ where: { id: r.id }, data: { status: "SUBMITTED", submittedAt: new Date() } }),
      db.paymentRoute.update({ where: { id: r.route.id }, data: { status: "CONSUMED" } }),
      db.job.upsert({ where: { idempotencyKey: `poll:${attempt.id}` }, update: {}, create: { type: "poll_route", batchId: r.batchId, recipientId: r.id, idempotencyKey: `poll:${attempt.id}`, runAt: new Date(Date.now() + POLL_SCHEDULE_MS[0]), payload: JSON.stringify({ attemptId: attempt.id, polls: 0, unknown: 0 }) } }),
    ]);
    await audit({ organizationId: r.batch.organizationId, batchId: r.batchId, recipientId: r.id, action: "payment.submitted", summary: `Row ${r.rowNumber} submitted (simulated)`, payload: { attemptNo, providerRequestId: sub.providerRequestId, simulated: true } });
  } catch (e) {
    // Submission itself failed before anything left: safe to mark failed and retry-eligible.
    const msg = (e as Error).message;
    await db.$transaction([
      db.executionAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", failReason: "SUBMIT_ERROR", retryable: true, finishedAt: new Date(), log: log(`submit error: ${msg}`, attempt.log) } }),
      db.batchRecipient.update({ where: { id: r.id }, data: { status: "RETRY_ELIGIBLE", lastError: msg } }),
    ]);
    await recomputeBatchStatus(r.batchId);
  }
}

/* ─────────────── poll_route ─────────────── */

export async function pollRoute(job: Job) {
  const payload = JSON.parse(job.payload) as { attemptId: string; polls: number; unknown?: number };
  const attempt = await db.executionAttempt.findUnique({ where: { id: payload.attemptId }, include: { recipient: { include: { batch: true } } } });
  if (!attempt) return;
  if (!["SUBMITTED", "PENDING", "UNKNOWN"].includes(attempt.status)) return;
  const r = attempt.recipient;
  const org = await db.organization.findUniqueOrThrow({ where: { id: r.batch.organizationId } });
  const provider = providerFor(r.batch.mode as "demo" | "real");
  const ref = attempt.providerRequestId;
  const st: StatusResult = ref ? await provider.status(ref) : { status: "unknown", inTxHashes: [], txHashes: [], failReason: null, retryable: false, details: "No provider reference", updatedAt: null };
  const polls = payload.polls + 1;
  const unknown = st.status === "unknown" ? (payload.unknown ?? 0) + 1 : 0;

  const requeue = async (delayIdx: number) => {
    await db.job.create({
      data: { type: "poll_route", batchId: r.batchId, recipientId: r.id, idempotencyKey: `poll:${attempt.id}:${polls}`, runAt: new Date(Date.now() + POLL_SCHEDULE_MS[Math.min(delayIdx, POLL_SCHEDULE_MS.length - 1)]), payload: JSON.stringify({ attemptId: attempt.id, polls, unknown }) },
    });
  };

  switch (st.status) {
    case "waiting":
    case "pending":
    case "submitted":
    case "delayed": {
      const txHash = st.txHashes[0] ?? attempt.txHash;
      await db.$transaction([
        db.executionAttempt.update({ where: { id: attempt.id }, data: { status: "SUBMITTED", providerStatus: st.status, txHash, log: log(`status ${st.status}`, attempt.log) } }),
        db.batchRecipient.update({ where: { id: r.id }, data: { status: st.status === "submitted" ? "CONFIRMING" : "SUBMITTED" } }),
      ]);
      if (polls >= MAX_POLLS) {
        // Do not fail it: the payment may still land. Flag for manual review instead.
        await db.executionAttempt.update({ where: { id: attempt.id }, data: { status: "UNKNOWN", log: log("poll limit reached; needs manual review", attempt.log) } });
        await db.batchRecipient.update({ where: { id: r.id }, data: { lastError: "Status still pending after the polling window. Check the provider before retrying." } });
        await recomputeBatchStatus(r.batchId);
        return;
      }
      await requeue(polls);
      return;
    }
    case "unknown": {
      await db.executionAttempt.update({ where: { id: attempt.id }, data: { providerStatus: "unknown", log: log(`status unreachable: ${st.details ?? ""}`, attempt.log) } });
      if (unknown >= MAX_UNKNOWN) {
        await db.executionAttempt.update({ where: { id: attempt.id }, data: { status: "UNKNOWN", finishedAt: new Date() } });
        await db.batchRecipient.update({ where: { id: r.id }, data: { lastError: `Provider status unavailable (${st.details ?? "no detail"}). Not retried automatically: the payment may have completed.` } });
        await audit({ organizationId: org.id, batchId: r.batchId, recipientId: r.id, action: "payment.unknown", summary: `Row ${r.rowNumber}: status unknown after ${unknown} checks; manual review required`, payload: { attemptId: attempt.id, details: st.details } });
        await recomputeBatchStatus(r.batchId);
        return;
      }
      await requeue(unknown + 1);
      return;
    }
    case "success": {
      const txHash = st.txHashes[0] ?? attempt.txHash;
      const fees = await db.paymentRoute.findUnique({ where: { recipientId: r.id }, select: { feeTotalUsd: true } });
      await db.$transaction([
        db.executionAttempt.update({ where: { id: attempt.id }, data: { status: "CONFIRMED", providerStatus: "success", txHash, finishedAt: new Date(), log: log(`success ${txHash ?? ""}`, attempt.log) } }),
        db.batchRecipient.update({ where: { id: r.id }, data: { status: "COMPLETED", completedAt: new Date(), lastError: null } }),
        db.reconciliationRecord.upsert({
          where: { recipientId: r.id },
          update: { status: "MATCHED", txHash, feeActual: fees?.feeTotalUsd ?? null, note: null, reconciledAt: new Date() },
          create: { recipientId: r.id, batchId: r.batchId, organizationId: org.id, status: "MATCHED", txHash, feeActual: fees?.feeTotalUsd ?? null, reconciledAt: new Date() },
        }),
      ]);
      await audit({ organizationId: org.id, batchId: r.batchId, recipientId: r.id, action: "payment.completed", summary: `Row ${r.rowNumber} completed${attempt.simulated ? " (simulated)" : ""}`, payload: { txHash, simulated: attempt.simulated, attemptNo: attempt.attemptNo } });
      await recomputeBatchStatus(r.batchId);
      return;
    }
    case "refund": {
      await db.$transaction([
        db.executionAttempt.update({ where: { id: attempt.id }, data: { status: "REFUNDED", providerStatus: "refund", failReason: st.failReason, finishedAt: new Date(), log: log(`refunded ${st.inTxHashes[0] ?? ""}`, attempt.log) } }),
        db.batchRecipient.update({ where: { id: r.id }, data: { status: "REFUNDED", lastError: st.details ?? st.failReason ?? "Refunded by provider" } }),
        db.reconciliationRecord.upsert({ where: { recipientId: r.id }, update: { status: "EXCEPTION", txHash: st.inTxHashes[0] ?? null, note: "Refunded to treasury" }, create: { recipientId: r.id, batchId: r.batchId, organizationId: org.id, status: "EXCEPTION", txHash: st.inTxHashes[0] ?? null, note: "Refunded to treasury" } }),
      ]);
      await audit({ organizationId: org.id, batchId: r.batchId, recipientId: r.id, action: "payment.refunded", summary: `Row ${r.rowNumber} refunded: ${st.failReason ?? "provider refund"}`, payload: { failReason: st.failReason } });
      await recomputeBatchStatus(r.batchId);
      return;
    }
    case "failure": {
      const retryable = st.retryable && r.attemptCount < org.maxRetries;
      await db.$transaction([
        db.executionAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", providerStatus: "failure", failReason: st.failReason, retryable: st.retryable, finishedAt: new Date(), log: log(`failure ${st.failReason ?? ""}`, attempt.log) } }),
        db.batchRecipient.update({ where: { id: r.id }, data: { status: retryable ? "RETRY_ELIGIBLE" : "FAILED", lastError: `${st.failReason ?? "FAILED"}${st.details ? `: ${st.details}` : ""}` } }),
        db.reconciliationRecord.upsert({ where: { recipientId: r.id }, update: { status: "EXCEPTION", note: st.failReason ?? "failed" }, create: { recipientId: r.id, batchId: r.batchId, organizationId: org.id, status: "EXCEPTION", note: st.failReason ?? "failed" } }),
      ]);
      await audit({ organizationId: org.id, batchId: r.batchId, recipientId: r.id, action: "payment.failed", summary: `Row ${r.rowNumber} failed: ${st.failReason ?? "unknown reason"}${retryable ? " (retry eligible)" : ""}`, payload: { failReason: st.failReason, retryable, attemptNo: attempt.attemptNo } });
      await recomputeBatchStatus(r.batchId);
      return;
    }
  }
}

/* ─────────────── batch status roll-up ─────────────── */

export async function recomputeBatchStatus(batchId: string) {
  const batch = await db.paymentBatch.findUnique({ where: { id: batchId } });
  if (!batch || !["EXECUTING", "PARTIALLY_FAILED", "FAILED", "COMPLETED"].includes(batch.status)) return;
  const rows = await db.batchRecipient.findMany({ where: { batchId, valid: true }, select: { status: true, attempts: { where: { status: "UNKNOWN" }, select: { id: true } } } });
  const active = rows.some((r) => !TERMINAL_RECIPIENT.includes(r.status as never) && r.status !== "RETRY_ELIGIBLE" && r.attempts.length === 0);
  if (active) return;
  const completed = rows.filter((r) => r.status === "COMPLETED").length;
  let status: string;
  if (completed === rows.length) status = "COMPLETED";
  else if (completed > 0) status = "PARTIALLY_FAILED";
  else status = "FAILED";
  if (status !== batch.status) {
    await db.paymentBatch.update({ where: { id: batchId }, data: { status, completedAt: status === "COMPLETED" ? new Date() : null } });
    await audit({ organizationId: batch.organizationId, batchId, action: `batch.${status.toLowerCase()}`, summary: status === "COMPLETED" ? `Batch completed: ${completed}/${rows.length} payments` : `Batch ${status.toLowerCase().replace("_", " ")}: ${completed}/${rows.length} completed`, payload: { completed, total: rows.length } });
  }
}
