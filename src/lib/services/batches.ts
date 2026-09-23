import "server-only";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { checkEvmAddress } from "@/lib/address";
import { KNOWN_ASSETS, JITTER_MAX_SECONDS, executionMode } from "@/lib/config";
import { parseNotBefore, validateCsvText, type ValidatedRow } from "@/lib/csv/validate";
import { CSV_LIMITS } from "@/lib/csv/parse";
import { EDITABLE_BATCH_STATUSES, OPERATION_KIND, canTransition, operationKindLabel, type BatchStatus, type OperationKind } from "@/lib/domain/states";
import { HttpError } from "@/lib/http";
import { MoneyError, parseAmount, sumUnits } from "@/lib/money";
import type { SessionContext } from "@/lib/auth/session";
import { enqueue } from "@/lib/worker/queue";

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

function actor(s: SessionContext) {
  return { actorId: s.userId, actorEmail: s.email, organizationId: s.organizationId };
}

export async function loadBatch(s: SessionContext, batchId: string) {
  const batch = await db.paymentBatch.findFirst({ where: { id: batchId, organizationId: s.organizationId } });
  if (!batch) throw new HttpError(404, "Operation not found", "NOT_FOUND");
  return batch;
}

/* ───────────────────────── create ───────────────────────── */

export async function createBatch(s: SessionContext, input: { name: string; kind?: string | null; reference?: string | null; deadlineAt?: string | null; jitterMaxSeconds?: number | null }) {
  const org = await db.organization.findUniqueOrThrow({ where: { id: s.organizationId } });
  const mode = executionMode();
  const kind: OperationKind = (OPERATION_KIND as readonly string[]).includes(input.kind ?? "") ? (input.kind as OperationKind) : "ACCUMULATE";
  const asset = KNOWN_ASSETS[org.originChainId]?.[org.assetSymbol];
  const deadlineAt = input.deadlineAt ? new Date(input.deadlineAt) : null;
  if (deadlineAt && Number.isNaN(deadlineAt.getTime())) throw new HttpError(400, "Invalid deadline");
  const jitter = clampJitter(input.jitterMaxSeconds ?? (org.jitterEnabled ? org.jitterMaxSeconds : 0), deadlineAt);
  const batch = await db.paymentBatch.create({
    data: {
      organizationId: s.organizationId,
      name: input.name.trim(),
      kind,
      reference: input.reference?.trim() || null,
      mode,
      assetSymbol: org.assetSymbol,
      assetDecimals: org.assetDecimals,
      assetAddress: asset?.address ?? null,
      originChainId: org.originChainId,
      destinationChainId: org.destinationChainId,
      deadlineAt,
      jitterMaxSeconds: jitter,
      createdById: s.userId,
      lastEditedById: s.userId,
    },
  });
  await audit({ ...actor(s), batchId: batch.id, action: "operation.created", summary: `${operationKindLabel(kind)} “${batch.name}” created (${mode} mode)`, payload: { mode, kind, deadlineAt, jitterMaxSeconds: jitter } });
  return batch;
}

export function clampJitter(seconds: number, deadlineAt: Date | null): number {
  let j = Math.max(0, Math.min(JITTER_MAX_SECONDS, Math.floor(seconds || 0)));
  if (deadlineAt) {
    const untilDeadline = Math.floor((deadlineAt.getTime() - Date.now()) / 1000);
    if (untilDeadline < j) j = Math.max(0, untilDeadline);
  }
  return j;
}

export async function updateBatchDetails(s: SessionContext, batchId: string, input: { name?: string; reference?: string | null; deadlineAt?: string | null; jitterMaxSeconds?: number | null }) {
  const batch = await loadBatch(s, batchId);
  if (!EDITABLE_BATCH_STATUSES.includes(batch.status as BatchStatus)) throw new HttpError(409, "Operation details can no longer be edited");
  const deadlineAt = input.deadlineAt === undefined ? batch.deadlineAt : input.deadlineAt ? new Date(input.deadlineAt) : null;
  const jitter = clampJitter(input.jitterMaxSeconds ?? batch.jitterMaxSeconds, deadlineAt);
  const updated = await db.paymentBatch.update({
    where: { id: batchId },
    data: { name: input.name?.trim() ?? batch.name, reference: input.reference === undefined ? batch.reference : input.reference?.trim() || null, deadlineAt, jitterMaxSeconds: jitter },
  });
  await audit({ ...actor(s), batchId, action: "operation.updated", summary: "Operation details updated", payload: input });
  return updated;
}

/* ───────────────────────── CSV import ───────────────────────── */

export async function importCsv(s: SessionContext, batchId: string, input: { fileName: string; text: string }) {
  const batch = await loadBatch(s, batchId);
  if (!EDITABLE_BATCH_STATUSES.includes(batch.status as BatchStatus)) throw new HttpError(409, "Legs cannot be replaced once the operation is funded");
  if (!/\.csv$/i.test(input.fileName)) throw new HttpError(400, "Only .csv files are accepted", "FILE_TYPE");
  if (Buffer.byteLength(input.text, "utf8") > CSV_LIMITS.maxBytes) throw new HttpError(413, `File exceeds ${CSV_LIMITS.maxBytes / 1024 / 1024} MB`, "FILE_SIZE");

  const summary = validateCsvText(input.text, { assetSymbol: batch.assetSymbol, assetDecimals: batch.assetDecimals, largeAmountWarn: 50_000n * 10n ** BigInt(batch.assetDecimals) });
  const csvHash = sha256(input.text);

  await db.$transaction(async (tx) => {
    await invalidateApprovalsTx(tx, batchId, "Leg set replaced by a new CSV import");
    await tx.paymentRoute.deleteMany({ where: { batchId } });
    await tx.batchRecipient.deleteMany({ where: { batchId } });
    if (summary.rows.length) {
      // SQLite has no createMany with many params limits problem at this scale; chunk anyway.
      const chunk = 200;
      for (let i = 0; i < summary.rows.length; i += chunk) {
        await tx.batchRecipient.createMany({ data: summary.rows.slice(i, i + chunk).map((r) => rowToData(batchId, r)) });
      }
    }
    await tx.paymentBatch.update({
      where: { id: batchId },
      data: { csvFileName: input.fileName, csvOriginal: input.text, csvHash, lastEditedById: s.userId },
    });
    await recomputeAggregatesTx(tx, batchId);
  });
  await audit({
    ...actor(s),
    batchId,
    action: "csv.validated",
    summary: summary.fileErrors.length
      ? `CSV “${input.fileName}” rejected: ${summary.fileErrors[0].message}`
      : `CSV “${input.fileName}” imported: ${summary.validCount} valid, ${summary.invalidCount} invalid`,
    payload: { fileName: input.fileName, csvHash, validCount: summary.validCount, invalidCount: summary.invalidCount, fileErrors: summary.fileErrors },
  });
  return summary;
}

function rowToData(batchId: string, r: ValidatedRow) {
  return {
    batchId,
    rowNumber: r.rowNumber,
    name: r.name,
    addressInput: r.addressInput,
    address: r.address,
    amountInput: r.amountInput,
    amount: r.amount,
    assetSymbol: r.assetSymbol,
    reference: r.reference,
    notBefore: r.notBefore ? new Date(r.notBefore) : null,
    valid: r.valid,
    errors: JSON.stringify(r.errors),
    warnings: JSON.stringify(r.warnings),
    status: "PENDING",
  };
}

function sha256(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

/** Hash of the valid leg set (address, amount). Approvals bind to this; any change invalidates them. */
export function recipientSetHash(rows: Array<{ address: string | null; amount: string | null; valid: boolean }>): string {
  const canon = rows
    .filter((r) => r.valid && r.address && r.amount)
    .map((r) => `${r.address!.toLowerCase()}:${r.amount}`)
    .sort()
    .join("\n");
  return sha256(canon);
}

async function recomputeAggregatesTx(tx: Tx, batchId: string) {
  const batch = await tx.paymentBatch.findUniqueOrThrow({ where: { id: batchId } });
  const rows = await tx.batchRecipient.findMany({ where: { batchId }, select: { address: true, amount: true, valid: true, status: true, route: { select: { status: true } } } });
  const valid = rows.filter((r) => r.valid);
  const totalAmount = sumUnits(valid.map((r) => r.amount)).toString();
  const invalidCount = rows.length - valid.length;
  const hash = recipientSetHash(rows);
  let status = batch.status as BatchStatus;
  if (EDITABLE_BATCH_STATUSES.includes(status)) {
    if (valid.length === 0 || invalidCount > 0) status = "DRAFT";
    else {
      const allRouted = valid.every((r) => r.route?.status === "QUOTED");
      if (status === "APPROVED" && hash === batch.recipientSetHash && allRouted) status = "APPROVED";
      else status = allRouted ? "ROUTES_PREPARED" : "VALIDATED";
    }
  }
  await tx.paymentBatch.update({
    where: { id: batchId },
    data: { totalAmount, validCount: valid.length, invalidCount, recipientSetHash: hash, status },
  });
}

async function invalidateApprovalsTx(tx: Tx, batchId: string, reason: string) {
  await tx.approval.updateMany({ where: { batchId, status: "ACTIVE" }, data: { status: "INVALIDATED", invalidatedAt: new Date(), invalidatedReason: reason } });
  await tx.paymentBatch.updateMany({ where: { id: batchId, status: "APPROVED" }, data: { status: "ROUTES_PREPARED", approvedAt: null } });
}

/* ───────────────────────── recipient edits ───────────────────────── */

export async function updateRecipient(s: SessionContext, batchId: string, recipientId: string, input: { name?: string; address?: string; amount?: string; reference?: string | null; notBefore?: string | null }) {
  const batch = await loadBatch(s, batchId);
  if (!EDITABLE_BATCH_STATUSES.includes(batch.status as BatchStatus)) throw new HttpError(409, "Legs cannot be edited once the operation is funded");
  const row = await db.batchRecipient.findFirst({ where: { id: recipientId, batchId } });
  if (!row) throw new HttpError(404, "Leg not found");

  const name = (input.name ?? row.name).trim();
  const addressInput = (input.address ?? row.addressInput).trim();
  const amountInput = (input.amount ?? row.amountInput).trim();
  const reference = input.reference === undefined ? row.reference : input.reference?.trim() || null;
  let notBefore: Date | null = row.notBefore;
  let notBeforeError: string | null = null;
  if (input.notBefore !== undefined) {
    if (!input.notBefore || !input.notBefore.trim()) notBefore = null;
    else {
      const iso = parseNotBefore(input.notBefore);
      if (iso) notBefore = new Date(iso);
      else notBeforeError = `not_before "${input.notBefore}" is not an ISO 8601 datetime`;
    }
  }

  const errors: Array<{ code: string; message: string; field?: string }> = [];
  const warnings: Array<{ code: string; message: string; field?: string }> = [];
  if (!name) errors.push({ code: "LABEL_EMPTY", message: "Leg label is empty", field: "label" });
  if (notBeforeError) errors.push({ code: "NOT_BEFORE_INVALID", message: notBeforeError, field: "not_before" });
  const ac = checkEvmAddress(addressInput);
  let address: string | null = null;
  if (ac.ok) {
    address = ac.address;
    if (ac.warning) warnings.push({ code: "ADDRESS_WARNING", message: ac.warning, field: "address" });
  } else errors.push({ code: ac.code, message: ac.message, field: "address" });
  let amount: string | null = null;
  try {
    amount = parseAmount(amountInput, batch.assetDecimals).toString();
  } catch (e) {
    errors.push({ code: (e as MoneyError).code ?? "AMOUNT_INVALID", message: (e as Error).message, field: "amount" });
  }
  if (address) {
    const dup = await db.batchRecipient.findFirst({ where: { batchId, id: { not: recipientId }, address: { equals: address } }, select: { rowNumber: true } });
    if (dup) errors.push({ code: "DUPLICATE_ADDRESS", message: `Same address as leg ${dup.rowNumber}. Merge or remove one of them`, field: "address" });
  }
  const valid = errors.length === 0;
  const changedMoney = address !== row.address || amount !== row.amount;

  const updated = await db.$transaction(async (tx) => {
    const u = await tx.batchRecipient.update({
      where: { id: recipientId },
      data: { name, addressInput, address, amountInput, amount, reference, notBefore, valid, errors: JSON.stringify(errors), warnings: JSON.stringify(warnings), status: "PENDING", lastError: null },
    });
    if (changedMoney) {
      await tx.paymentRoute.deleteMany({ where: { recipientId } });
      await invalidateApprovalsTx(tx, batchId, `Leg ${row.rowNumber} changed`);
    }
    // Re-check rows that were duplicates of this one's old address.
    if (row.address && address !== row.address) await reValidateDuplicatesTx(tx, batchId, row.address);
    await tx.paymentBatch.update({ where: { id: batchId }, data: { lastEditedById: s.userId } });
    await recomputeAggregatesTx(tx, batchId);
    return u;
  });
  await audit({ ...actor(s), batchId, recipientId, action: "leg.updated", summary: `Leg ${row.rowNumber} edited (${valid ? "now valid" : errors.length + " error(s)"})`, payload: { before: { address: row.address, amount: row.amount }, after: { address, amount } } });
  return updated;
}

async function reValidateDuplicatesTx(tx: Tx, batchId: string, address: string) {
  const dups = await tx.batchRecipient.findMany({ where: { batchId, address }, orderBy: { rowNumber: "asc" } });
  for (let i = 0; i < dups.length; i++) {
    const d = dups[i];
    const errs = (JSON.parse(d.errors) as Array<{ code: string; message: string; field?: string }>).filter((e) => e.code !== "DUPLICATE_ADDRESS");
    if (i > 0) errs.push({ code: "DUPLICATE_ADDRESS", message: `Same address as leg ${dups[0].rowNumber}. Merge or remove one of them`, field: "address" });
    await tx.batchRecipient.update({ where: { id: d.id }, data: { errors: JSON.stringify(errs), valid: errs.length === 0 && !!d.amount && !!d.name } });
  }
}

export async function removeRecipient(s: SessionContext, batchId: string, recipientId: string) {
  const batch = await loadBatch(s, batchId);
  if (!EDITABLE_BATCH_STATUSES.includes(batch.status as BatchStatus)) throw new HttpError(409, "Legs cannot be removed once the operation is funded");
  const row = await db.batchRecipient.findFirst({ where: { id: recipientId, batchId } });
  if (!row) throw new HttpError(404, "Leg not found");
  await db.$transaction(async (tx) => {
    await tx.batchRecipient.delete({ where: { id: recipientId } });
    if (row.address) await reValidateDuplicatesTx(tx, batchId, row.address);
    if (row.valid) await invalidateApprovalsTx(tx, batchId, `Leg ${row.rowNumber} removed`);
    await tx.paymentBatch.update({ where: { id: batchId }, data: { lastEditedById: s.userId } });
    await recomputeAggregatesTx(tx, batchId);
  });
  await audit({ ...actor(s), batchId, action: "leg.removed", summary: `Leg ${row.rowNumber} (${row.name || "unlabelled"}) removed`, payload: { rowNumber: row.rowNumber } });
}

/* ───────────────────────── routes ───────────────────────── */

export async function requestRoutePreparation(s: SessionContext, batchId: string) {
  const batch = await loadBatch(s, batchId);
  if (!["VALIDATED", "ROUTES_PREPARED", "APPROVED"].includes(batch.status)) throw new HttpError(409, "Routes can be prepared only after every leg is valid");
  if (batch.validCount === 0) throw new HttpError(409, "No valid legs");
  const org = await db.organization.findUniqueOrThrow({ where: { id: s.organizationId } });
  if (batch.mode === "real" && !org.treasuryAddress) throw new HttpError(409, "Set the desk wallet address in Settings before preparing real routes");
  await db.$transaction(async (tx) => {
    if (batch.status === "APPROVED") await invalidateApprovalsTx(tx, batchId, "Routes re-prepared");
    // Drop stale/unavailable routes so they are quoted again; keep fresh QUOTED ones.
    await tx.paymentRoute.deleteMany({ where: { batchId, OR: [{ status: { in: ["STALE", "UNAVAILABLE"] } }, { expiresAt: { lt: new Date() } }] } });
    await tx.batchRecipient.updateMany({ where: { batchId, valid: true, status: { in: ["PENDING", "ROUTE_UNAVAILABLE"] } }, data: { status: "PENDING", lastError: null } });
  });
  await enqueue({ type: "prepare_routes", batchId, idempotencyKey: `prepare:${batchId}:${Date.now()}` });
  await audit({ ...actor(s), batchId, action: "routes.requested", summary: `Route preparation started for ${batch.validCount} leg(s)` });
}

/* ───────────────────────── approval ───────────────────────── */

export async function approveBatch(s: SessionContext, batchId: string, note?: string | null) {
  const batch = await loadBatch(s, batchId);
  const org = await db.organization.findUniqueOrThrow({ where: { id: s.organizationId } });
  if (batch.status !== "ROUTES_PREPARED") throw new HttpError(409, batch.status === "APPROVED" ? "Operation is already approved" : "Routes must be prepared before approval");
  if (org.requireFourEyes && batch.lastEditedById === s.userId) {
    throw new HttpError(409, "Four-eyes rule: the person who last edited the legs cannot approve them (disable in Settings to allow)", "FOUR_EYES");
  }
  const rows = await db.batchRecipient.findMany({ where: { batchId, valid: true }, include: { route: true } });
  const hash = recipientSetHash(rows);
  if (hash !== batch.recipientSetHash) throw new HttpError(409, "Leg set changed since it was loaded; refresh and review again");
  const now = new Date();
  const notReady = rows.filter((r) => !r.route || r.route.status !== "QUOTED" || (r.route.expiresAt && r.route.expiresAt < now));
  if (notReady.length) throw new HttpError(409, `${notReady.length} leg(s) have no fresh route. Prepare routes again.`, "ROUTES_STALE");
  const approval = await db.$transaction(async (tx) => {
    const a = await tx.approval.create({ data: { batchId, approverId: s.userId, approverEmail: s.email, recipientSetHash: hash, totalAmount: batch.totalAmount, note: note?.trim() || null } });
    await tx.paymentBatch.update({ where: { id: batchId }, data: { status: "APPROVED", approvedAt: now } });
    return a;
  });
  await audit({ ...actor(s), batchId, action: "operation.approved", summary: `Approved by ${s.email} · ${rows.length} legs`, payload: { approvalId: approval.id, recipientSetHash: hash, totalAmount: batch.totalAmount, note } });
  return approval;
}

export async function revokeApproval(s: SessionContext, batchId: string, reason: string) {
  const batch = await loadBatch(s, batchId);
  if (batch.status !== "APPROVED") throw new HttpError(409, "Operation is not in an approved state");
  await db.$transaction((tx) => invalidateApprovalsTx(tx, batchId, reason || "Revoked by approver"));
  await audit({ ...actor(s), batchId, action: "operation.approval_revoked", summary: `Approval revoked: ${reason || "no reason given"}` });
}

/* ───────────────────────── funding ───────────────────────── */

export async function fundBatch(s: SessionContext, batchId: string, input: { fromAddress?: string; txHash?: string | null; attestedBalance?: string | null }) {
  const batch = await loadBatch(s, batchId);
  if (batch.status !== "APPROVED") throw new HttpError(409, "Operation must be approved before funding");
  const approval = await db.approval.findFirst({ where: { batchId, status: "ACTIVE" } });
  if (!approval || approval.recipientSetHash !== batch.recipientSetHash) throw new HttpError(409, "Active approval no longer matches the leg set", "APPROVAL_INVALID");
  const routes = await db.paymentRoute.findMany({ where: { batchId, status: "QUOTED" }, select: { amountIn: true } });
  const required = sumUnits(routes.map((r) => r.amountIn)).toString();
  const org = await db.organization.findUniqueOrThrow({ where: { id: s.organizationId } });

  let fromAddress = input.fromAddress?.trim() || org.treasuryAddress || "0x0000000000000000000000000000000000000000";
  let status: string;
  let simulated = false;
  let note: string | null = null;
  if (batch.mode === "demo") {
    status = "SIMULATED";
    simulated = true;
    fromAddress = org.treasuryAddress || "0xD3m0000000000000000000000000000000000000".toLowerCase();
    note = "Simulated funding. No on-chain transfer occurred.";
  } else {
    const ac = checkEvmAddress(fromAddress);
    if (!ac.ok) throw new HttpError(400, "Connected wallet address is invalid");
    if (org.treasuryAddress && ac.address.toLowerCase() !== org.treasuryAddress.toLowerCase()) {
      throw new HttpError(409, `Connected wallet ${ac.address} is not the configured desk wallet ${org.treasuryAddress}`, "WRONG_WALLET");
    }
    if (!input.attestedBalance) throw new HttpError(400, "Wallet balance is required to confirm funding");
    if (BigInt(input.attestedBalance) < BigInt(required)) throw new HttpError(409, "Desk wallet balance is below the funding requirement", "INSUFFICIENT_BALANCE");
    fromAddress = ac.address;
    status = "CONFIRMED";
    note = "Balance read from the connected desk wallet at funding time.";
  }
  const funding = await db.$transaction(async (tx) => {
    const f = await tx.fundingTransaction.create({ data: { batchId, chainId: batch.originChainId, fromAddress, txHash: input.txHash || null, amount: required, assetSymbol: batch.assetSymbol, status, simulated, note, confirmedAt: new Date() } });
    await tx.paymentBatch.update({ where: { id: batchId }, data: { status: "FUNDED", fundedAt: new Date() } });
    return f;
  });
  await audit({ ...actor(s), batchId, action: "funding.recorded", summary: simulated ? "Simulated funding recorded" : `Funding confirmed from ${fromAddress}`, payload: { fundingId: funding.id, amount: required, simulated } });
  return funding;
}

/* ───────────────────────── execution ───────────────────────── */

export async function startExecution(s: SessionContext, batchId: string) {
  const batch = await loadBatch(s, batchId);
  if (batch.status === "EXECUTING") return { started: false, reason: "already executing" };
  if (!canTransition(batch.status, "EXECUTING")) throw new HttpError(409, `Cannot execute an operation in status ${batch.status}`);
  if (batch.mode !== executionMode()) throw new HttpError(409, `Operation was created in ${batch.mode} mode but the server is in ${executionMode()} mode`, "MODE_MISMATCH");
  const approval = await db.approval.findFirst({ where: { batchId, status: "ACTIVE" } });
  if (!approval || approval.recipientSetHash !== batch.recipientSetHash) throw new HttpError(409, "Active approval does not match the leg set", "APPROVAL_INVALID");
  if (batch.deadlineAt && batch.deadlineAt < new Date()) throw new HttpError(409, "Operation deadline has passed; set a new deadline and re-approve");

  const recipients = await db.batchRecipient.findMany({ where: { batchId, valid: true, status: { in: ["ROUTED", "RETRY_ELIGIBLE"] } }, include: { route: true } });
  if (!recipients.length) throw new HttpError(409, "No legs are ready to execute");
  const now = Date.now();
  await db.$transaction(async (tx) => {
    for (const r of recipients) {
      if (!r.route || r.route.status !== "QUOTED") continue;
      const jitter = batch.jitterMaxSeconds > 0 ? Math.floor(Math.random() * batch.jitterMaxSeconds * 1000) : 0;
      let runAt = new Date(now + jitter);
      // A leg's not-before time always wins over jitter; the deadline caps everything.
      if (r.notBefore && r.notBefore > runAt) runAt = r.notBefore;
      if (batch.deadlineAt && runAt > batch.deadlineAt) runAt = new Date(batch.deadlineAt.getTime() - 1000);
      await tx.batchRecipient.update({ where: { id: r.id }, data: { status: "SCHEDULED", scheduledFor: runAt } });
      if (batch.mode === "demo") {
        await tx.job.upsert({
          where: { idempotencyKey: `exec:${batchId}:${r.id}:${r.attemptCount + 1}` },
          update: {},
          create: { type: "execute_route", batchId, recipientId: r.id, idempotencyKey: `exec:${batchId}:${r.id}:${r.attemptCount + 1}`, runAt, payload: JSON.stringify({ attemptNo: r.attemptCount + 1 }) },
        });
      }
    }
    await tx.paymentBatch.update({ where: { id: batchId }, data: { status: "EXECUTING", executionStartedAt: batch.executionStartedAt ?? new Date() } });
  });
  await audit({ ...actor(s), batchId, action: "execution.started", summary: `Execution started for ${recipients.length} leg(s)${batch.jitterMaxSeconds ? ` with up to ${batch.jitterMaxSeconds}s spacing` : ""}`, payload: { count: recipients.length, jitterMaxSeconds: batch.jitterMaxSeconds, mode: batch.mode } });
  return { started: true, count: recipients.length };
}

/** Real mode: the browser signed and broadcast a step for a route; record it and start polling. */
export async function recordSignedAttempt(s: SessionContext, batchId: string, recipientId: string, input: { txHash: string; stepId: string }) {
  const batch = await loadBatch(s, batchId);
  if (batch.mode !== "real") throw new HttpError(409, "Only real-mode operations accept signed transactions");
  if (batch.status !== "EXECUTING") throw new HttpError(409, "Operation is not executing");
  const r = await db.batchRecipient.findFirst({ where: { id: recipientId, batchId }, include: { route: true, attempts: { orderBy: { attemptNo: "desc" }, take: 1 } } });
  if (!r || !r.route) throw new HttpError(404, "Leg or route not found");
  if (!/^0x[0-9a-fA-F]{64}$/.test(input.txHash)) throw new HttpError(400, "Invalid transaction hash");
  const last = r.attempts[0];
  if (last && ["PENDING", "SUBMITTED", "UNKNOWN"].includes(last.status)) throw new HttpError(409, "Previous attempt is still pending; wait for its result", "ATTEMPT_PENDING");
  if (!["SCHEDULED", "ROUTED", "RETRY_ELIGIBLE"].includes(r.status)) throw new HttpError(409, `Leg is ${r.status}`);
  const attemptNo = r.attemptCount + 1;
  const key = `exec:${batchId}:${recipientId}:${attemptNo}`;
  const attempt = await db.$transaction(async (tx) => {
    const a = await tx.executionAttempt.create({
      data: { recipientId, batchId, attemptNo, idempotencyKey: key, provider: r.route!.provider, providerRequestId: r.route!.providerRequestId, txHash: input.txHash, status: "SUBMITTED", simulated: false, log: JSON.stringify([{ at: new Date().toISOString(), event: "signed", detail: `${input.stepId} ${input.txHash}` }]) },
    });
    await tx.batchRecipient.update({ where: { id: recipientId }, data: { status: "SUBMITTED", attemptCount: attemptNo, submittedAt: new Date() } });
    await tx.paymentRoute.update({ where: { id: r.route!.id }, data: { status: "CONSUMED" } });
    await tx.job.upsert({ where: { idempotencyKey: `poll:${a.id}` }, update: {}, create: { type: "poll_route", batchId, recipientId, idempotencyKey: `poll:${a.id}`, runAt: new Date(Date.now() + 3000), payload: JSON.stringify({ attemptId: a.id, polls: 0 }) } });
    return a;
  });
  await audit({ ...actor(s), batchId, recipientId, action: "leg.submitted", summary: `Transaction ${input.txHash.slice(0, 10)}… signed for leg ${r.rowNumber}`, payload: { txHash: input.txHash, attemptNo } });
  return attempt;
}

/* ───────────────────────── retry ───────────────────────── */

export async function retryPayment(s: SessionContext, recipientId: string) {
  const r = await db.batchRecipient.findFirst({ where: { id: recipientId, batch: { organizationId: s.organizationId } }, include: { batch: true, route: true, attempts: { orderBy: { attemptNo: "desc" }, take: 1 } } });
  if (!r) throw new HttpError(404, "Leg not found");
  const org = await db.organization.findUniqueOrThrow({ where: { id: s.organizationId } });
  const last = r.attempts[0];
  if (last && ["PENDING", "SUBMITTED", "UNKNOWN"].includes(last.status)) {
    throw new HttpError(409, "The previous attempt has not reached a final state. Retrying now could execute the leg twice.", "ATTEMPT_PENDING");
  }
  if (r.status !== "RETRY_ELIGIBLE") throw new HttpError(409, `Leg is ${r.status}; only retry-eligible legs can be retried`);
  if (r.attemptCount >= org.maxRetries) throw new HttpError(409, `Retry limit of ${org.maxRetries} reached`);
  if (r.batch.mode !== executionMode()) throw new HttpError(409, "Server mode differs from the operation mode", "MODE_MISMATCH");

  // Fresh quote for the retry.
  const { quoteRecipient } = await import("@/lib/worker/handlers");
  const quoted = await quoteRecipient(r.batch, r);
  if (!quoted) throw new HttpError(409, "Could not obtain a fresh route for the retry; try again later", "ROUTE_UNAVAILABLE");
  const attemptNo = r.attemptCount + 1;
  await db.$transaction(async (tx) => {
    await tx.batchRecipient.update({ where: { id: recipientId }, data: { status: "SCHEDULED", scheduledFor: new Date(), lastError: null } });
    if (r.batch.mode === "demo") {
      await tx.job.upsert({ where: { idempotencyKey: `exec:${r.batchId}:${recipientId}:${attemptNo}` }, update: {}, create: { type: "execute_route", batchId: r.batchId, recipientId, idempotencyKey: `exec:${r.batchId}:${recipientId}:${attemptNo}`, payload: JSON.stringify({ attemptNo }) } });
    }
    await tx.paymentBatch.update({ where: { id: r.batchId }, data: { status: "EXECUTING" } });
  });
  await audit({ ...actor(s), batchId: r.batchId, recipientId, action: "leg.retried", summary: `Retry ${attemptNo} requested for leg ${r.rowNumber}`, payload: { attemptNo } });
}

/* ───────────────────────── cancel ───────────────────────── */

export async function cancelBatch(s: SessionContext, batchId: string, reason: string) {
  const batch = await loadBatch(s, batchId);
  if (!canTransition(batch.status, "CANCELLED")) throw new HttpError(409, `An operation in status ${batch.status} cannot be cancelled`);
  await db.$transaction(async (tx) => {
    await invalidateApprovalsTx(tx, batchId, "Operation cancelled");
    await tx.paymentBatch.update({ where: { id: batchId }, data: { status: "CANCELLED" } });
    await tx.batchRecipient.updateMany({ where: { batchId }, data: { status: "CANCELLED" } });
    await tx.job.updateMany({ where: { batchId, status: "QUEUED" }, data: { status: "DONE", lastError: "operation cancelled" } });
  });
  await audit({ ...actor(s), batchId, action: "operation.cancelled", summary: `Operation cancelled: ${reason || "no reason given"}` });
}
