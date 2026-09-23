/**
 * Demo seed: one desk ("Halden Desk") with four users (one per role) and five operations at
 * different lifecycle stages so the overview is meaningful on first open. Every operation is
 * mode "demo" and every settlement reference is simulated. Run: npm run db:seed
 */
import { createPrismaClient } from "../src/lib/db";
import { createHash, randomBytes, scryptSync } from "node:crypto";

const db = createPrismaClient();

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString("hex")}`;
}
const hex = (s: string, n: number) => createHash("sha256").update(s).digest("hex").slice(0, n);
const addr = (seed: string) => "0x" + hex("addr:" + seed, 40);
const CHAIN = 4663;
const ASSET = "USDG";
const DEC = 6;
const USDG_ADDRESS = process.env.SHEAF_USDG_ADDRESS_4663 || "0x0000000000000000000000000000000000000000";
const units = (n: string) => {
  const [w, f = ""] = n.split(".");
  return (BigInt(w) * 10n ** BigInt(DEC) + BigInt(f.padEnd(DEC, "0"))).toString();
};

type Kind = "CLAIM" | "ACCUMULATE" | "OTC" | "TREASURY";
type Stage = "completed" | "partial" | "approved" | "draft" | "executing";
interface Leg {
  label: string;
  amount: string;
  notBefore?: Date | null;
  memo?: string | null;
}

const RESTRICTED = "RESTRICTED_TOKEN: recipient not allowlisted (simulated)";
const CAPACITY = "SOLVER_CAPACITY_EXCEEDED: Solver capacity exhausted; safe to retry (simulated)";

async function main() {
  const PASSWORD = "sheaf-demo-2026";
  const orgExisting = await db.organization.findUnique({ where: { slug: "halden-desk" } });
  if (orgExisting) {
    console.log("Seed already present (halden-desk). Delete prisma/dev.db to reseed.");
    return;
  }
  const org = await db.organization.create({ data: { name: "Halden Desk", slug: "halden-desk", treasuryAddress: "0x" + hex("desk-wallet", 40), assetSymbol: ASSET, assetDecimals: DEC, originChainId: CHAIN, destinationChainId: CHAIN } });
  const users = await Promise.all(
    [
      ["Nadia Ferreira", "owner@halden.example", "OWNER"],
      ["Tomas Berg", "desk@halden.example", "FINANCE_ADMIN"],
      ["Ines Okafor", "approver@halden.example", "APPROVER"],
      ["Rae Mahdi", "viewer@halden.example", "VIEWER"],
    ].map(async ([name, email, role]) => {
      const u = await db.user.create({ data: { name, email, passwordHash: hashPassword(PASSWORD) } });
      await db.membership.create({ data: { userId: u.id, organizationId: org.id, role } });
      return { ...u, role };
    }),
  );
  const [owner, desk, approver] = users;
  const audit = (batchId: string | null, action: string, summary: string, actorEmail: string | null, createdAt: Date, recipientId?: string) =>
    db.auditEvent.create({ data: { organizationId: org.id, batchId, recipientId, action, summary, actorEmail, actorId: null, createdAt } });

  const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86_400_000 - h * 3_600_000);
  const KIND_LABEL: Record<Kind, string> = { CLAIM: "Private allocation claim", ACCUMULATE: "Stealth accumulation", OTC: "Private OTC block", TREASURY: "Delegated treasury" };

  async function makeOperation(opts: { name: string; kind: Kind; reference: string; legs: Leg[]; stage: Stage; created: Date; failedIndex?: number; retryIndex?: number }) {
    const rows = opts.legs.map((l, i) => ({ ...l, address: addr(opts.name + i), amountUnits: units(l.amount) }));
    const csv =
      "label,address,asset,amount,not_before,memo\n" +
      rows.map((r) => `${r.label},${r.address},${ASSET},${r.amount},${r.notBefore ? r.notBefore.toISOString() : ""},${r.memo ?? ""}`).join("\n");
    const total = rows.reduce((a, r) => a + BigInt(r.amountUnits), 0n).toString();
    const setHash = createHash("sha256").update(rows.map((r) => `${r.address}:${r.amountUnits}`).sort().join("\n")).digest("hex");
    const status = { completed: "COMPLETED", partial: "PARTIALLY_FAILED", approved: "APPROVED", draft: "DRAFT", executing: "EXECUTING" }[opts.stage];
    const executed = ["completed", "partial", "executing"].includes(opts.stage);
    const batch = await db.paymentBatch.create({
      data: {
        organizationId: org.id, name: opts.name, kind: opts.kind, reference: opts.reference, status, mode: "demo", assetSymbol: ASSET, assetDecimals: DEC, assetAddress: USDG_ADDRESS, originChainId: CHAIN, destinationChainId: CHAIN,
        csvFileName: `${opts.reference.toLowerCase()}.csv`, csvOriginal: csv, csvHash: createHash("sha256").update(csv).digest("hex"), recipientSetHash: setHash, totalAmount: total, validCount: rows.length, invalidCount: 0,
        createdById: desk.id, lastEditedById: desk.id, createdAt: opts.created, updatedAt: opts.created,
        approvedAt: opts.stage === "draft" ? null : new Date(opts.created.getTime() + 3_600_000),
        fundedAt: executed ? new Date(opts.created.getTime() + 4_000_000) : null,
        executionStartedAt: executed ? new Date(opts.created.getTime() + 4_100_000) : null,
        completedAt: opts.stage === "completed" ? new Date(opts.created.getTime() + 3 * 86_400_000 + 5_000_000) : null,
      },
    });
    await audit(batch.id, "operation.created", `${KIND_LABEL[opts.kind]} “${opts.name}” created (demo mode)`, desk.email, opts.created);
    await audit(batch.id, "csv.validated", `CSV “${batch.csvFileName}” imported: ${rows.length} valid, 0 invalid`, desk.email, new Date(opts.created.getTime() + 600_000));
    if (opts.stage !== "draft") {
      await audit(batch.id, "routes.prepared", `Routes ready for all ${rows.length} legs`, null, new Date(opts.created.getTime() + 1_200_000));
      await db.approval.create({ data: { batchId: batch.id, approverId: approver.id, approverEmail: approver.email, recipientSetHash: setHash, totalAmount: total, note: "Reviewed against the desk plan.", createdAt: batch.approvedAt! } });
      await audit(batch.id, "operation.approved", `Approved by ${approver.email} · ${rows.length} legs`, approver.email, batch.approvedAt!);
    }
    if (executed) {
      await db.fundingTransaction.create({ data: { batchId: batch.id, chainId: CHAIN, fromAddress: org.treasuryAddress!, amount: total, assetSymbol: ASSET, status: "SIMULATED", simulated: true, note: "Simulated funding. No on-chain transfer occurred.", createdAt: batch.fundedAt!, confirmedAt: batch.fundedAt! } });
      await audit(batch.id, "funding.recorded", "Simulated funding recorded", desk.email, batch.fundedAt!);
      await audit(batch.id, "execution.started", `Execution started for ${rows.length} leg(s)`, desk.email, batch.executionStartedAt!);
    }
    let completedCount = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const failed = opts.stage === "partial" && i === opts.failedIndex;
      const retry = opts.stage === "partial" && i === opts.retryIndex;
      // Executing operation: the first half settled, the next one is in flight, the rest wait.
      const pending = opts.stage === "executing" && i >= Math.floor(rows.length / 2);
      const inFlight = opts.stage === "executing" && i === Math.floor(rows.length / 2);
      let rstatus: string;
      if (opts.stage === "draft") rstatus = "PENDING";
      else if (opts.stage === "approved") rstatus = "ROUTED";
      else if (failed) rstatus = "FAILED";
      else if (retry) rstatus = "RETRY_ELIGIBLE";
      else if (inFlight) rstatus = "SUBMITTED";
      else if (pending) rstatus = "SCHEDULED";
      else rstatus = "COMPLETED";
      const base = r.notBefore && r.notBefore > batch.executionStartedAt! ? r.notBefore : batch.executionStartedAt;
      const submittedAt = executed && !pending ? new Date(base!.getTime() + (i % 4) * 9_000 + 2_000) : inFlight ? new Date(Date.now() - 20_000) : null;
      const completedAt = rstatus === "COMPLETED" ? new Date(submittedAt!.getTime() + 14_000) : null;
      if (rstatus === "COMPLETED") completedCount++;
      const rec = await db.batchRecipient.create({
        data: {
          batchId: batch.id, rowNumber: i + 1, name: r.label, addressInput: r.address, address: r.address, amountInput: r.amount, amount: r.amountUnits, assetSymbol: ASSET, reference: r.memo ?? null, notBefore: r.notBefore ?? null, valid: true, status: rstatus,
          attemptCount: ["PENDING", "ROUTED", "SCHEDULED"].includes(rstatus) ? 0 : 1, scheduledFor: pending ? (r.notBefore ?? new Date(Date.now() + 600_000 * (i + 1))) : null, submittedAt, completedAt,
          lastError: failed ? RESTRICTED : retry ? CAPACITY : null, createdAt: opts.created,
        },
      });
      if (opts.stage !== "draft") {
        const gas = "45696624454598";
        await db.paymentRoute.create({ data: { recipientId: rec.id, batchId: batch.id, provider: "mock", providerRequestId: "sim-q-" + hex(batch.id + rec.id, 24), routeKind: "direct_transfer", originChainId: CHAIN, destinationChainId: CHAIN, steps: JSON.stringify([{ id: "send", kind: "transaction", description: "Send USDG to the leg's destination", chainId: CHAIN, to: USDG_ADDRESS, data: "0xa9059cbb", value: "0" }]), fees: JSON.stringify({ gas: { symbol: "ETH", amount: gas, amountFormatted: "0.00004570", amountUsd: "0.118811" }, relayer: { symbol: ASSET, amount: "0", amountFormatted: "0.000000", amountUsd: "0.000000" }, totalUsd: "0.118811" }), feeTotalUsd: "0.118811", amountIn: r.amountUnits, timeEstimateSec: 4, quotedAt: new Date(opts.created.getTime() + 1_200_000), expiresAt: new Date(opts.created.getTime() + 2_100_000), status: ["ROUTED", "SCHEDULED"].includes(rstatus) ? "QUOTED" : "CONSUMED", raw: JSON.stringify({ simulated: true }) } });
      }
      if (submittedAt) {
        const txHash = "0x" + hex("fill:" + rec.id, 64);
        const st = rstatus === "COMPLETED" ? "CONFIRMED" : rstatus === "SUBMITTED" ? "SUBMITTED" : "FAILED";
        const reason = failed ? "RESTRICTED_TOKEN" : retry ? "SOLVER_CAPACITY_EXCEEDED" : null;
        await db.executionAttempt.create({ data: { recipientId: rec.id, batchId: batch.id, attemptNo: 1, idempotencyKey: `exec:${batch.id}:${rec.id}:1`, provider: "mock", providerRequestId: "sim-tx-" + hex(rec.id, 32), txHash: st === "CONFIRMED" ? txHash : null, providerStatus: st === "CONFIRMED" ? "success" : st === "SUBMITTED" ? "pending" : "failure", status: st, failReason: reason, retryable: retry, simulated: true, log: JSON.stringify([{ at: submittedAt.toISOString(), event: "submitted (simulated)" }, ...(st === "SUBMITTED" ? [] : [{ at: (completedAt ?? new Date(submittedAt.getTime() + 12_000)).toISOString(), event: st === "CONFIRMED" ? `success ${txHash}` : `failure ${reason}` }])]), startedAt: submittedAt, finishedAt: st === "SUBMITTED" ? null : completedAt ?? new Date(submittedAt.getTime() + 12_000) } });
        if (st !== "SUBMITTED") {
          await db.reconciliationRecord.create({ data: { recipientId: rec.id, batchId: batch.id, organizationId: org.id, status: st === "CONFIRMED" ? (i % 5 === 0 ? "UNRECONCILED" : "MATCHED") : "EXCEPTION", txHash: st === "CONFIRMED" ? txHash : null, feeActual: st === "CONFIRMED" ? "0.118811" : null, note: reason, reconciledAt: completedAt } });
        }
        await audit(batch.id, "leg.submitted", `Leg ${i + 1} submitted (simulated)`, null, submittedAt, rec.id);
        if (st !== "SUBMITTED") {
          await audit(batch.id, st === "CONFIRMED" ? "leg.completed" : "leg.failed", st === "CONFIRMED" ? `Leg ${i + 1} completed (simulated)` : `Leg ${i + 1} failed: ${failed ? RESTRICTED : "SOLVER_CAPACITY_EXCEEDED (retry eligible)"}`, null, completedAt ?? new Date(submittedAt.getTime() + 12_000), rec.id);
        }
      }
    }
    if (opts.stage === "completed") await audit(batch.id, "operation.completed", `Operation completed: ${rows.length}/${rows.length} legs`, null, batch.completedAt!);
    if (opts.stage === "partial") await audit(batch.id, "operation.partially_failed", `Operation partially failed: ${completedCount}/${rows.length} legs completed`, null, new Date(batch.executionStartedAt!.getTime() + 3 * 86_400_000));
    return batch;
  }

  const spread = (created: Date, n: number, days: number) => Array.from({ length: n }, (_, i) => new Date(created.getTime() + 4_200_000 + Math.floor((i * days * 86_400_000) / n)));
  const AMOUNTS = ["1250.00", "980.50", "2100.00", "1500.00", "760.25", "3200.00", "1120.00", "890.00", "2450.75", "1010.00", "1875.00", "640.00"];

  // 1. Completed stealth accumulation: 12 legs, not-before spread over three days.
  const c1 = daysAgo(21);
  await makeOperation({
    name: "Q3 accumulation plan",
    kind: "ACCUMULATE",
    reference: "2026-Q3-ACC",
    stage: "completed",
    created: c1,
    legs: spread(c1, 12, 3).map((nb, i) => ({ label: `Tranche ${String(i + 1).padStart(2, "0")}`, amount: AMOUNTS[i], notBefore: nb, memo: `fresh recipient ${String.fromCharCode(65 + i)}` })),
  });

  // 2. Partially failed stealth accumulation: one leg hit a restricted token, one is retry-eligible.
  const c2 = daysAgo(6);
  await makeOperation({
    name: "October accumulation plan",
    kind: "ACCUMULATE",
    reference: "2026-10-ACC",
    stage: "partial",
    created: c2,
    failedIndex: 3,
    retryIndex: 6,
    legs: spread(c2, 8, 3).map((nb, i) => ({ label: `Tranche ${String(i + 1).padStart(2, "0")}`, amount: AMOUNTS[(i + 4) % AMOUNTS.length], notBefore: nb, memo: i === 3 ? "stock token tranche (restricted)" : `fresh recipient ${String.fromCharCode(65 + i)}` })),
  });

  // 3. Approved private allocation claim: 5 legs, eligible accounts claiming into fresh recipients.
  await makeOperation({
    name: "Launch allocation claim",
    kind: "CLAIM",
    reference: "2026-09-CLAIM",
    stage: "approved",
    created: daysAgo(0, 6),
    legs: Array.from({ length: 5 }, (_, i) => ({ label: `Eligible account ${i + 1}`, amount: AMOUNTS[(i + 2) % AMOUNTS.length], memo: `claim into fresh recipient ${String.fromCharCode(65 + i)}` })),
  });

  // 4. Draft private OTC block: a single leg against one counterparty.
  await makeOperation({
    name: "Block vs. desk 7",
    kind: "OTC",
    reference: "2026-10-OTC-07",
    stage: "draft",
    created: daysAgo(0, 1),
    legs: [{ label: "Desk 7", amount: "25000.00", memo: "want 1,000 HOOD stock tokens · expires 2026-10-03T16:00Z · receive into fresh address" }],
  });

  // 5. Executing delegated treasury: 4 legs, half settled, one in flight.
  await makeOperation({
    name: "Weekly delegated payouts",
    kind: "TREASURY",
    reference: "2026-W39-TRS",
    stage: "executing",
    created: daysAgo(0, 2),
    legs: Array.from({ length: 4 }, (_, i) => ({ label: `Payee ${i + 1}`, amount: AMOUNTS[(i + 7) % AMOUNTS.length], memo: `daily cap 10,000 ${ASSET}` })),
  });

  await audit(null, "organization.created", "Desk “Halden Desk” created (seed)", owner.email, daysAgo(60));
  console.log(`Seeded Halden Desk. Sign in with any of:\n  owner@halden.example\n  desk@halden.example\n  approver@halden.example\n  viewer@halden.example\nPassword: ${PASSWORD}`);
}

main().finally(() => db.$disconnect());
