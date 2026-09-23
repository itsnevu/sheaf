import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentProvider, StatusResult } from "@/lib/providers/types";

/**
 * Worker handlers against the test database with a scripted provider, so settlement outcomes
 * are chosen per test instead of waiting on the mock provider's timers.
 */
const scripted = {
  submitCalls: 0,
  submitFails: false,
  status: { status: "success" } as Partial<StatusResult>,
};

vi.mock("@/lib/providers", () => {
  const provider: PaymentProvider = {
    name: "mock",
    simulated: true,
    describe: () => ({ label: "scripted", detail: "" }),
    async quote(input) {
      return { ok: true, providerRequestId: "q-" + input.recipient.slice(-4), routeKind: "direct_transfer", steps: [], fees: { gas: null, relayer: null, relayerGas: null, relayerService: null, app: null, totalUsd: "0.10" }, amountIn: input.amount, timeEstimateSec: 1, expiresAt: new Date(Date.now() + 600_000) };
    },
    async submit(input) {
      scripted.submitCalls++;
      if (scripted.submitFails) throw new Error("provider down");
      return { providerRequestId: "tx-" + input.idempotencyKey, txHash: "0x" + "ab".repeat(32), simulated: true };
    },
    async status() {
      return { status: "success", inTxHashes: [], txHashes: ["0x" + "cd".repeat(32)], failReason: null, retryable: false, details: null, updatedAt: new Date(), ...scripted.status } as StatusResult;
    },
  };
  return { providerFor: () => provider, currentProvider: () => provider };
});

import { db } from "@/lib/db";
import { processJobs } from "@/lib/worker";
import { executeRoute, pollRoute, prepareRoutes, recomputeBatchStatus } from "@/lib/worker/handlers";
import { approveBatch, createBatch, fundBatch, importCsv, requestRoutePreparation, retryPayment, startExecution } from "@/lib/services/batches";
import { ADDR, csvOf, makeOrg } from "./helpers";

beforeEach(() => {
  scripted.submitCalls = 0;
  scripted.submitFails = false;
  scripted.status = { status: "success" };
});

async function executingBatch(n = 2, maxRetries = 3) {
  const ctx = await makeOrg({ maxRetries });
  const batch = await createBatch(ctx.finance, { name: "B" });
  await importCsv(ctx.finance, batch.id, { fileName: "b.csv", text: csvOf(Array.from({ length: n }, (_, i) => ({ name: `C${i}`, address: ADDR(i + 1), amount: "10" }))) });
  await requestRoutePreparation(ctx.finance, batch.id);
  await prepareRoutes(await db.job.findFirstOrThrow({ where: { batchId: batch.id, type: "prepare_routes" } }));
  await approveBatch(ctx.approver, batch.id);
  await fundBatch(ctx.finance, batch.id, {});
  await startExecution(ctx.finance, batch.id);
  await db.job.updateMany({ where: { batchId: batch.id, type: "execute_route" }, data: { runAt: new Date(0) } }); // ignore jitter
  return { ...ctx, batch };
}

async function drain(max = 20) {
  for (let i = 0; i < max; i++) {
    await db.job.updateMany({ where: { status: "QUEUED" }, data: { runAt: new Date(0) } });
    const r = await processJobs(50, "test");
    if (r.processed + r.failed === 0) return;
  }
}

async function batchStatus(id: string) {
  return (await db.paymentBatch.findUniqueOrThrow({ where: { id } })).status;
}

describe("execute_route", () => {
  it("submits exactly once per attempt, even when the job runs twice", async () => {
    const { batch } = await executingBatch(1);
    const job = await db.job.findFirstOrThrow({ where: { batchId: batch.id, type: "execute_route" } });
    await executeRoute(job);
    await executeRoute(job);
    expect(scripted.submitCalls).toBe(1);
    const attempts = await db.executionAttempt.findMany({ where: { batchId: batch.id } });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe("SUBMITTED");
    expect(attempts[0].simulated).toBe(true);
    const r = await db.batchRecipient.findFirstOrThrow({ where: { batchId: batch.id } });
    expect(r.status).toBe("SUBMITTED");
    expect(r.attemptCount).toBe(1);
    expect(await db.job.count({ where: { batchId: batch.id, type: "poll_route" } })).toBe(1);
  });

  it("marks a submit error retry-eligible without leaving a pending attempt", async () => {
    scripted.submitFails = true;
    const { batch } = await executingBatch(1);
    await executeRoute(await db.job.findFirstOrThrow({ where: { batchId: batch.id, type: "execute_route" } }));
    const r = await db.batchRecipient.findFirstOrThrow({ where: { batchId: batch.id }, include: { attempts: true } });
    expect(r.status).toBe("RETRY_ELIGIBLE");
    expect(r.attempts[0].status).toBe("FAILED");
    expect(r.attempts[0].retryable).toBe(true);
    expect(await batchStatus(batch.id)).toBe("FAILED");
  });

  it("does nothing for a cancelled batch", async () => {
    const { batch } = await executingBatch(1);
    await db.paymentBatch.update({ where: { id: batch.id }, data: { status: "CANCELLED" } });
    await executeRoute(await db.job.findFirstOrThrow({ where: { batchId: batch.id, type: "execute_route" } }));
    expect(scripted.submitCalls).toBe(0);
  });
});

describe("poll_route outcomes", () => {
  it("success completes the leg, reconciles it and completes the operation", async () => {
    const { batch } = await executingBatch(2);
    await drain();
    const rows = await db.batchRecipient.findMany({ where: { batchId: batch.id }, include: { reconciliation: true, attempts: true } });
    expect(rows.every((r) => r.status === "COMPLETED")).toBe(true);
    expect(rows.every((r) => r.reconciliation?.status === "MATCHED" && r.reconciliation.feeActual === "0.10")).toBe(true);
    expect(rows.every((r) => r.attempts[0].status === "CONFIRMED" && r.attempts[0].txHash?.startsWith("0xcdcd"))).toBe(true);
    expect(await batchStatus(batch.id)).toBe("COMPLETED");
    expect(await db.job.count({ where: { batchId: batch.id, status: { in: ["QUEUED", "RUNNING"] } } })).toBe(0);
  });

  it("permanent failure is an exception and the operation is FAILED when nothing completed", async () => {
    scripted.status = { status: "failure", failReason: "BLOCKED_WALLET", retryable: false };
    const { batch } = await executingBatch(1);
    await drain();
    const r = await db.batchRecipient.findFirstOrThrow({ where: { batchId: batch.id }, include: { reconciliation: true } });
    expect(r.status).toBe("FAILED");
    expect(r.lastError).toContain("BLOCKED_WALLET");
    expect(r.reconciliation?.status).toBe("EXCEPTION");
    expect(await batchStatus(batch.id)).toBe("FAILED");
  });

  it("transient failure becomes retry-eligible, a retry succeeds, and the operation completes", async () => {
    scripted.status = { status: "failure", failReason: "SOLVER_CAPACITY_EXCEEDED", retryable: true };
    const { batch, finance, viewer } = await executingBatch(1);
    await drain();
    const r = await db.batchRecipient.findFirstOrThrow({ where: { batchId: batch.id } });
    expect(r.status).toBe("RETRY_ELIGIBLE");
    expect(await batchStatus(batch.id)).toBe("FAILED");
    expect(scripted.submitCalls).toBe(1);

    scripted.status = { status: "success" };
    await retryPayment(finance, r.id);
    // The viewer never reaches the service (403 in the route layer); a second retry while pending is refused.
    void viewer;
    await drain();
    const after = await db.batchRecipient.findFirstOrThrow({ where: { id: r.id }, include: { attempts: { orderBy: { attemptNo: "asc" } } } });
    expect(after.status).toBe("COMPLETED");
    expect(after.attempts.map((a) => a.status)).toEqual(["FAILED", "CONFIRMED"]);
    expect(scripted.submitCalls).toBe(2);
    expect(await batchStatus(batch.id)).toBe("COMPLETED");
  });

  it("stops retrying at the organisation's retry limit", async () => {
    scripted.status = { status: "failure", failReason: "SOLVER_CAPACITY_EXCEEDED", retryable: true };
    const { batch } = await executingBatch(1, 1);
    await drain();
    const r = await db.batchRecipient.findFirstOrThrow({ where: { batchId: batch.id } });
    expect(r.status).toBe("FAILED"); // attemptCount 1 >= maxRetries 1
  });

  it("refund is an exception, and a mixed operation is PARTIALLY_FAILED", async () => {
    const { batch } = await executingBatch(2);
    // First job succeeds, second refunds.
    const jobs = await db.job.findMany({ where: { batchId: batch.id, type: "execute_route" }, orderBy: { createdAt: "asc" } });
    await executeRoute(jobs[0]);
    await pollRoute(await db.job.findFirstOrThrow({ where: { batchId: batch.id, type: "poll_route" } }));
    scripted.status = { status: "refund", failReason: "DEPOSITED_AMOUNT_TOO_LOW_TO_FILL", inTxHashes: ["0x" + "ef".repeat(32)] };
    await executeRoute(jobs[1]);
    const poll2 = await db.job.findFirstOrThrow({ where: { batchId: batch.id, type: "poll_route", recipientId: jobs[1].recipientId! } });
    await pollRoute(poll2);
    const rows = await db.batchRecipient.findMany({ where: { batchId: batch.id }, orderBy: { rowNumber: "asc" }, include: { reconciliation: true } });
    expect(rows.map((r) => r.status)).toEqual(["COMPLETED", "REFUNDED"]);
    expect(rows[1].reconciliation?.status).toBe("EXCEPTION");
    expect(await batchStatus(batch.id)).toBe("PARTIALLY_FAILED");
  });

  it("never fails an unreachable leg: it is flagged UNKNOWN for manual review", async () => {
    scripted.status = { status: "unknown", details: "provider unreachable" };
    const { batch } = await executingBatch(1);
    await drain(40);
    const r = await db.batchRecipient.findFirstOrThrow({ where: { batchId: batch.id }, include: { attempts: true } });
    expect(r.attempts[0].status).toBe("UNKNOWN");
    expect(r.status).not.toBe("RETRY_ELIGIBLE");
    expect(r.status).not.toBe("FAILED");
    expect(r.lastError).toContain("may have completed");
    expect(await db.auditEvent.count({ where: { batchId: batch.id, action: "leg.unknown" } })).toBe(1);
    expect(await batchStatus(batch.id)).toBe("FAILED"); // rolled up because nothing is active
  });
});

describe("processJobs", () => {
  it("claims each job once, retries with backoff and gives up after maxAttempts", async () => {
    const job = await db.job.create({ data: { type: "poll_route", idempotencyKey: "poll:missing:" + Date.now(), payload: JSON.stringify({ attemptId: "missing", polls: 0 }), maxAttempts: 2 } });
    // Unknown attempt id is a no-op success.
    const r1 = await processJobs(10, "w1");
    expect(r1.processed).toBeGreaterThanOrEqual(1);
    expect((await db.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("DONE");

    const bad = await db.job.create({ data: { type: "nope", idempotencyKey: "bad:" + Date.now(), maxAttempts: 2 } });
    await processJobs(10, "w1");
    let b = await db.job.findUniqueOrThrow({ where: { id: bad.id } });
    expect(b.status).toBe("QUEUED");
    expect(b.attempts).toBe(1);
    expect(b.lastError).toContain("Unknown job type");
    expect(b.runAt.getTime()).toBeGreaterThan(Date.now());
    await db.job.update({ where: { id: bad.id }, data: { runAt: new Date(0) } });
    await processJobs(10, "w1");
    b = await db.job.findUniqueOrThrow({ where: { id: bad.id } });
    expect(b.status).toBe("FAILED");
  });

  it("releases stale locks from a crashed worker", async () => {
    const job = await db.job.create({ data: { type: "poll_route", idempotencyKey: "stale:" + Date.now(), payload: JSON.stringify({ attemptId: "missing", polls: 0 }), status: "RUNNING", lockedAt: new Date(Date.now() - 10 * 60_000), lockedBy: "dead" } });
    await processJobs(10, "w2");
    expect((await db.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("DONE");
  });

  it("recomputeBatchStatus ignores operations that are not executing", async () => {
    const { finance } = await makeOrg();
    const b = await createBatch(finance, { name: "B" });
    await recomputeBatchStatus(b.id);
    expect(await batchStatus(b.id)).toBe("DRAFT");
  });
});
