import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { approveBatch, cancelBatch, createBatch, fundBatch, importCsv, recipientSetHash, removeRecipient, requestRoutePreparation, retryPayment, revokeApproval, startExecution, updateRecipient } from "@/lib/services/batches";
import { prepareRoutes } from "@/lib/worker/handlers";
import { ADDR, auditActions, csvOf, makeOrg } from "./helpers";

async function status(id: string) {
  return (await db.paymentBatch.findUniqueOrThrow({ where: { id } })).status;
}

async function expectHttp(p: Promise<unknown>, status: number, code?: string) {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    expect((e as HttpError).status).toBe(status);
    if (code) expect((e as HttpError).code).toBe(code);
    return;
  }
  throw new Error(`expected HTTP ${status}`);
}

/** Drive an operation to ROUTES_PREPARED with three valid legs. */
async function preparedBatch(fourEyes = true) {
  const ctx = await makeOrg({ requireFourEyes: fourEyes });
  const batch = await createBatch(ctx.finance, { name: "Q4 plan", kind: "ACCUMULATE" });
  const summary = await importCsv(ctx.finance, batch.id, { fileName: "sept.csv", text: csvOf([1, 2, 3].map((i) => ({ name: `C${i}`, address: ADDR(i), amount: `${i}0.50`, reference: `INV-${i}` }))) });
  expect(summary.validCount).toBe(3);
  await requestRoutePreparation(ctx.finance, batch.id);
  const job = await db.job.findFirstOrThrow({ where: { batchId: batch.id, type: "prepare_routes" } });
  await prepareRoutes(job);
  expect(await status(batch.id)).toBe("ROUTES_PREPARED");
  return { ...ctx, batch };
}

describe("operation lifecycle", () => {
  it("creates in the server mode and records an audit event", async () => {
    const { finance } = await makeOrg();
    const b = await createBatch(finance, { name: "  Test  ", reference: " R1 ", jitterMaxSeconds: 99_999 });
    expect(b.name).toBe("Test");
    expect(b.reference).toBe("R1");
    expect(b.mode).toBe("demo");
    expect(b.kind).toBe("ACCUMULATE"); // default kind
    expect(b.assetSymbol).toBe("USDG");
    expect(b.destinationChainId).toBe(4663);
    expect(b.status).toBe("DRAFT");
    expect(b.jitterMaxSeconds).toBe(1800); // clamped to the bound
    expect(await auditActions(b.id)).toEqual(["operation.created"]);
  });

  it("stores the operation kind and falls back to ACCUMULATE for unknown kinds", async () => {
    const { finance } = await makeOrg();
    for (const kind of ["CLAIM", "OTC", "TREASURY"]) expect((await createBatch(finance, { name: kind, kind })).kind).toBe(kind);
    expect((await createBatch(finance, { name: "x", kind: "PAYROLL" })).kind).toBe("ACCUMULATE");
  });

  it("imports not_before and memo on each leg", async () => {
    const { finance } = await makeOrg();
    const b = await createBatch(finance, { name: "B", kind: "ACCUMULATE" });
    const s = await importCsv(finance, b.id, { fileName: "x.csv", text: csvOf([{ name: "T1", address: ADDR(1), amount: "10", notBefore: "2030-01-01T09:00:00Z", reference: "memo 1" }, { name: "T2", address: ADDR(2), amount: "10", notBefore: "soon" }]) });
    expect(s.validCount).toBe(1);
    expect(s.rows[1].errors[0].code).toBe("NOT_BEFORE_INVALID");
    const rows = await db.batchRecipient.findMany({ where: { batchId: b.id }, orderBy: { rowNumber: "asc" } });
    expect(rows[0].notBefore?.toISOString()).toBe("2030-01-01T09:00:00.000Z");
    expect(rows[0].reference).toBe("memo 1");
    const fixed = await updateRecipient(finance, b.id, rows[1].id, { notBefore: "2030-01-02T09:00:00Z" });
    expect(fixed.valid).toBe(true);
    expect(fixed.notBefore?.toISOString()).toBe("2030-01-02T09:00:00.000Z");
    const cleared = await updateRecipient(finance, b.id, rows[1].id, { notBefore: null });
    expect(cleared.notBefore).toBeNull();
  });

  it("imports a CSV, keeps invalid rows, and computes totals", async () => {
    const { finance } = await makeOrg();
    const b = await createBatch(finance, { name: "B" });
    const text = csvOf([
      { name: "Ok", address: ADDR(1), amount: "100" },
      { name: "Bad address", address: "0x123", amount: "5" },
      { name: "Bad amount", address: ADDR(2), amount: "abc" },
      { name: "Dup", address: ADDR(1), amount: "1" },
    ]);
    const s = await importCsv(finance, b.id, { fileName: "x.csv", text });
    expect(s.validCount).toBe(1);
    expect(s.invalidCount).toBe(3);
    const rows = await db.batchRecipient.findMany({ where: { batchId: b.id }, orderBy: { rowNumber: "asc" } });
    expect(rows).toHaveLength(4);
    expect(rows.map((r) => r.valid)).toEqual([true, false, false, false]);
    const batch = await db.paymentBatch.findUniqueOrThrow({ where: { id: b.id } });
    expect(batch.status).toBe("DRAFT");
    expect(batch.totalAmount).toBe("100000000");
    expect(batch.csvOriginal).toBe(text);
    await expectHttp(importCsv(finance, b.id, { fileName: "x.xlsx", text }), 400, "FILE_TYPE");
  });

  it("moves to VALIDATED when corrections make every row valid", async () => {
    const { finance } = await makeOrg();
    const b = await createBatch(finance, { name: "B" });
    await importCsv(finance, b.id, { fileName: "x.csv", text: csvOf([{ name: "Ok", address: ADDR(1), amount: "100" }, { name: "Bad", address: "0x123", amount: "5" }]) });
    const bad = await db.batchRecipient.findFirstOrThrow({ where: { batchId: b.id, rowNumber: 2 } });
    const fixed = await updateRecipient(finance, b.id, bad.id, { address: ADDR(2) });
    expect(fixed.valid).toBe(true);
    expect(await status(b.id)).toBe("VALIDATED");
    // Removing the other row keeps it valid with one recipient.
    const ok = await db.batchRecipient.findFirstOrThrow({ where: { batchId: b.id, rowNumber: 1 } });
    await removeRecipient(finance, b.id, ok.id);
    expect(await status(b.id)).toBe("VALIDATED");
    expect((await db.paymentBatch.findUniqueOrThrow({ where: { id: b.id } })).validCount).toBe(1);
  });

  it("refuses approval before routes and refuses execution before funding", async () => {
    const { finance, approver } = await makeOrg();
    const b = await createBatch(finance, { name: "B" });
    await importCsv(finance, b.id, { fileName: "x.csv", text: csvOf([{ name: "Ok", address: ADDR(1), amount: "1" }]) });
    await expectHttp(approveBatch(approver, b.id), 409);
    await expectHttp(startExecution(finance, b.id), 409);
    await expectHttp(fundBatch(finance, b.id, {}), 409);
  });

  it("prepares routes and reports unavailable ones without advancing", async () => {
    const { finance } = await makeOrg();
    const b = await createBatch(finance, { name: "B" });
    const noRoute = "0x11111111111111111111111111111111111111ee";
    await importCsv(finance, b.id, { fileName: "x.csv", text: csvOf([{ name: "A", address: ADDR(1), amount: "1" }, { name: "B", address: noRoute, amount: "1" }]) });
    await requestRoutePreparation(finance, b.id);
    const job = await db.job.findFirstOrThrow({ where: { batchId: b.id, type: "prepare_routes" } });
    await prepareRoutes(job);
    expect(await status(b.id)).toBe("VALIDATED");
    const rows = await db.batchRecipient.findMany({ where: { batchId: b.id }, include: { route: true }, orderBy: { rowNumber: "asc" } });
    expect(rows[0].status).toBe("ROUTED");
    expect(rows[0].route?.status).toBe("QUOTED");
    expect(rows[1].status).toBe("ROUTE_UNAVAILABLE");
    expect(rows[1].lastError).toContain("NO_QUOTES");
    await removeRecipient(finance, b.id, rows[1].id);
    expect(await status(b.id)).toBe("ROUTES_PREPARED");
  });
});

describe("approval", () => {
  it("enforces four-eyes and binds to the recipient-set hash", async () => {
    const { batch, finance, approver, owner } = await preparedBatch();
    // The desk operator edited last: four-eyes blocks them even though owners may approve.
    await expectHttp(approveBatch(finance, batch.id), 409, "FOUR_EYES");
    const approval = await approveBatch(approver, batch.id, "Looks right");
    const b = await db.paymentBatch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(b.status).toBe("APPROVED");
    expect(approval.recipientSetHash).toBe(b.recipientSetHash);
    expect(approval.totalAmount).toBe(b.totalAmount);
    await expectHttp(approveBatch(owner, batch.id), 409); // already approved
  });

  it("stays approved on a reference-only edit but is invalidated by a money change", async () => {
    const { batch, finance, approver } = await preparedBatch();
    await approveBatch(approver, batch.id);
    const rows = await db.batchRecipient.findMany({ where: { batchId: batch.id }, orderBy: { rowNumber: "asc" } });
    await updateRecipient(finance, batch.id, rows[0].id, { reference: "INV-1-b" });
    expect(await status(batch.id)).toBe("APPROVED");
    await updateRecipient(finance, batch.id, rows[0].id, { amount: "999" });
    expect(await status(batch.id)).toBe("VALIDATED"); // route dropped, so not even ROUTES_PREPARED
    const a = await db.approval.findFirstOrThrow({ where: { batchId: batch.id } });
    expect(a.status).toBe("INVALIDATED");
    expect(a.invalidatedReason).toContain("Leg 1 changed");
  });

  it("can be revoked and approved again after re-preparing", async () => {
    const { batch, finance, approver } = await preparedBatch();
    await approveBatch(approver, batch.id);
    await revokeApproval(approver, batch.id, "second thoughts");
    expect(await status(batch.id)).toBe("ROUTES_PREPARED");
    await approveBatch(approver, batch.id);
    expect(await status(batch.id)).toBe("APPROVED");
    await requestRoutePreparation(finance, batch.id); // re-preparing invalidates
    expect(await status(batch.id)).toBe("ROUTES_PREPARED");
  });

  it("allows the editor to approve when four-eyes is disabled", async () => {
    const { batch, finance } = await preparedBatch(false);
    await approveBatch(finance, batch.id);
    expect(await status(batch.id)).toBe("APPROVED");
  });
});

describe("funding and execution", () => {
  it("records simulated funding and schedules one job per recipient, idempotently", async () => {
    const { batch, finance, approver } = await preparedBatch();
    await approveBatch(approver, batch.id);
    const f = await fundBatch(finance, batch.id, {});
    expect(f.simulated).toBe(true);
    expect(f.status).toBe("SIMULATED");
    expect(await status(batch.id)).toBe("FUNDED");
    const started = await startExecution(finance, batch.id);
    expect(started).toEqual({ started: true, count: 3 });
    expect(await status(batch.id)).toBe("EXECUTING");
    const jobs = await db.job.findMany({ where: { batchId: batch.id, type: "execute_route" } });
    expect(jobs).toHaveLength(3);
    expect(await startExecution(finance, batch.id)).toEqual({ started: false, reason: "already executing" });
    expect(await db.job.count({ where: { batchId: batch.id, type: "execute_route" } })).toBe(3);
    const actions = await auditActions(batch.id);
    expect(actions.slice(-3)).toEqual(["operation.approved", "funding.recorded", "execution.started"]);
  });

  it("never schedules a leg before its not_before time", async () => {
    const ctx = await makeOrg();
    const batch = await createBatch(ctx.finance, { name: "Plan", kind: "ACCUMULATE" });
    const later = "2030-06-01T09:00:00Z";
    await importCsv(ctx.finance, batch.id, { fileName: "p.csv", text: csvOf([{ name: "Now", address: ADDR(1), amount: "1" }, { name: "Later", address: ADDR(2), amount: "1", notBefore: later }]) });
    await requestRoutePreparation(ctx.finance, batch.id);
    await prepareRoutes(await db.job.findFirstOrThrow({ where: { batchId: batch.id, type: "prepare_routes" } }));
    await approveBatch(ctx.approver, batch.id);
    await fundBatch(ctx.finance, batch.id, {});
    await startExecution(ctx.finance, batch.id);
    const rows = await db.batchRecipient.findMany({ where: { batchId: batch.id }, orderBy: { rowNumber: "asc" } });
    expect(rows[0].scheduledFor!.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(rows[1].scheduledFor!.toISOString()).toBe("2030-06-01T09:00:00.000Z");
    const job = await db.job.findFirstOrThrow({ where: { batchId: batch.id, recipientId: rows[1].id, type: "execute_route" } });
    expect(job.runAt.toISOString()).toBe("2030-06-01T09:00:00.000Z");
  });

  it("refuses execution when the approval no longer matches", async () => {
    const { batch, finance, approver } = await preparedBatch();
    await approveBatch(approver, batch.id);
    await fundBatch(finance, batch.id, {});
    // Tamper below the service layer: recipient set changes after funding.
    await db.paymentBatch.update({ where: { id: batch.id }, data: { recipientSetHash: "deadbeef" } });
    await expectHttp(startExecution(finance, batch.id), 409, "APPROVAL_INVALID");
  });

  it("refuses execution past the deadline", async () => {
    const { batch, finance, approver } = await preparedBatch();
    await approveBatch(approver, batch.id);
    await fundBatch(finance, batch.id, {});
    await db.paymentBatch.update({ where: { id: batch.id }, data: { deadlineAt: new Date(Date.now() - 1000) } });
    await expectHttp(startExecution(finance, batch.id), 409);
  });

  it("locks recipients once funded", async () => {
    const { batch, finance, approver } = await preparedBatch();
    await approveBatch(approver, batch.id);
    await fundBatch(finance, batch.id, {});
    const row = await db.batchRecipient.findFirstOrThrow({ where: { batchId: batch.id } });
    await expectHttp(updateRecipient(finance, batch.id, row.id, { amount: "1" }), 409);
    await expectHttp(removeRecipient(finance, batch.id, row.id), 409);
    await expectHttp(importCsv(finance, batch.id, { fileName: "y.csv", text: csvOf([]) }), 409);
  });

  it("retry is refused unless the leg is retry-eligible", async () => {
    const { batch, finance } = await preparedBatch();
    const row = await db.batchRecipient.findFirstOrThrow({ where: { batchId: batch.id } });
    await expectHttp(retryPayment(finance, row.id), 409);
  });

  it("cancels a draft and marks queued jobs done", async () => {
    const { batch, finance } = await preparedBatch();
    await cancelBatch(finance, batch.id, "not needed");
    expect(await status(batch.id)).toBe("CANCELLED");
    const rows = await db.batchRecipient.findMany({ where: { batchId: batch.id } });
    expect(rows.every((r) => r.status === "CANCELLED")).toBe(true);
    expect(await db.job.count({ where: { batchId: batch.id, status: "QUEUED" } })).toBe(0);
  });

  it("isolates desks", async () => {
    const { batch } = await preparedBatch();
    const other = await makeOrg();
    await expectHttp(approveBatch(other.approver, batch.id), 404, "NOT_FOUND");
    await expectHttp(startExecution(other.owner, batch.id), 404);
  });
});

describe("recipientSetHash", () => {
  it("is order-independent, case-insensitive and ignores invalid rows", () => {
    const a = recipientSetHash([{ address: ADDR(1), amount: "1", valid: true }, { address: ADDR(2), amount: "2", valid: true }, { address: ADDR(3), amount: "3", valid: false }]);
    const b = recipientSetHash([{ address: ADDR(2), amount: "2", valid: true }, { address: ADDR(1).toUpperCase().replace("0X", "0x"), amount: "1", valid: true }]);
    expect(a).toBe(b);
    expect(recipientSetHash([{ address: ADDR(1), amount: "2", valid: true }, { address: ADDR(2), amount: "2", valid: true }])).not.toBe(a);
  });
});
