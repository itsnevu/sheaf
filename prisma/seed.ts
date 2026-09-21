/**
 * Demo seed: one organisation with four users (one per role) and a few batches at different
 * lifecycle stages so the dashboard is meaningful on first open. Every batch is mode "demo"
 * and every settlement reference is simulated. Run: npm run db:seed
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
const DEC = 6;
const units = (n: string) => {
  const [w, f = ""] = n.split(".");
  return (BigInt(w) * 10n ** BigInt(DEC) + BigInt(f.padEnd(DEC, "0"))).toString();
};

const NAMES = ["Ada Okafor", "Mateo Ruiz", "Priya Natarajan", "Jonas Lindqvist", "Amara Diallo", "Kenji Watanabe", "Sofia Marin", "Tomasz Nowak", "Leila Haddad", "Diego Fernández", "Hana Kobayashi", "Noor Rahman", "Elias Berg", "Yara Costa", "Ifeoma Nwosu", "Lucas Moreau"];
const AMOUNTS = ["1250.00", "980.50", "2100.00", "1500.00", "760.25", "3200.00", "1120.00", "890.00", "2450.75", "1010.00", "1875.00", "640.00", "2999.99", "1330.40", "710.00", "1580.00"];

async function main() {
  const PASSWORD = "sheaf-demo-2026";
  const orgExisting = await db.organization.findUnique({ where: { slug: "northwind-labs" } });
  if (orgExisting) {
    console.log("Seed already present (northwind-labs). Delete prisma/dev.db to reseed.");
    return;
  }
  const org = await db.organization.create({ data: { name: "Northwind Labs", slug: "northwind-labs", treasuryAddress: "0x" + hex("treasury", 40), assetSymbol: "USDC", assetDecimals: DEC, originChainId: 8453, destinationChainId: 8453 } });
  const users = await Promise.all(
    [
      ["Owner", "owner@northwind.example", "OWNER"],
      ["Finance Admin", "finance@northwind.example", "FINANCE_ADMIN"],
      ["Approver", "approver@northwind.example", "APPROVER"],
      ["Viewer", "viewer@northwind.example", "VIEWER"],
    ].map(async ([name, email, role]) => {
      const u = await db.user.create({ data: { name, email, passwordHash: hashPassword(PASSWORD) } });
      await db.membership.create({ data: { userId: u.id, organizationId: org.id, role } });
      return { ...u, role };
    }),
  );
  const [owner, finance, approver] = users;
  const audit = (batchId: string | null, action: string, summary: string, actorEmail: string | null, createdAt: Date, recipientId?: string) =>
    db.auditEvent.create({ data: { organizationId: org.id, batchId, recipientId, action, summary, actorEmail, actorId: null, createdAt } });

  const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * 86_400_000 - h * 3_600_000);

  async function makeBatch(opts: { name: string; reference: string; count: number; stage: "completed" | "partial" | "approved" | "draft"; created: Date }) {
    const rows = Array.from({ length: opts.count }, (_, i) => ({ name: NAMES[i % NAMES.length], address: addr(opts.name + i), amount: units(AMOUNTS[i % AMOUNTS.length]), ref: `INV-${opts.reference}-${String(i + 1).padStart(3, "0")}` }));
    const csv = "name,address,amount,asset,reference\n" + rows.map((r) => `${r.name},${r.address},${AMOUNTS[rows.indexOf(r) % AMOUNTS.length]},USDC,${r.ref}`).join("\n");
    const total = rows.reduce((a, r) => a + BigInt(r.amount), 0n).toString();
    const setHash = createHash("sha256").update(rows.map((r) => `${r.address}:${r.amount}`).sort().join("\n")).digest("hex");
    const status = { completed: "COMPLETED", partial: "PARTIALLY_FAILED", approved: "APPROVED", draft: "DRAFT" }[opts.stage];
    const batch = await db.paymentBatch.create({
      data: {
        organizationId: org.id, name: opts.name, reference: opts.reference, status, mode: "demo", assetSymbol: "USDC", assetDecimals: DEC, assetAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", originChainId: 8453, destinationChainId: 8453,
        csvFileName: `${opts.reference.toLowerCase()}.csv`, csvOriginal: csv, csvHash: createHash("sha256").update(csv).digest("hex"), recipientSetHash: setHash, totalAmount: total, validCount: rows.length, invalidCount: 0,
        createdById: finance.id, lastEditedById: finance.id, createdAt: opts.created, updatedAt: opts.created,
        approvedAt: opts.stage === "draft" ? null : new Date(opts.created.getTime() + 3_600_000),
        fundedAt: ["completed", "partial"].includes(opts.stage) ? new Date(opts.created.getTime() + 4_000_000) : null,
        executionStartedAt: ["completed", "partial"].includes(opts.stage) ? new Date(opts.created.getTime() + 4_100_000) : null,
        completedAt: opts.stage === "completed" ? new Date(opts.created.getTime() + 5_000_000) : null,
      },
    });
    await audit(batch.id, "batch.created", `Batch “${opts.name}” created (demo mode)`, finance.email, opts.created);
    await audit(batch.id, "csv.validated", `CSV “${batch.csvFileName}” imported: ${rows.length} valid, 0 invalid`, finance.email, new Date(opts.created.getTime() + 600_000));
    if (opts.stage !== "draft") {
      await audit(batch.id, "routes.prepared", `Routes ready for all ${rows.length} recipients`, null, new Date(opts.created.getTime() + 1_200_000));
      await db.approval.create({ data: { batchId: batch.id, approverId: approver.id, approverEmail: approver.email, recipientSetHash: setHash, totalAmount: total, note: "Reviewed against the September contractor register.", createdAt: batch.approvedAt! } });
      await audit(batch.id, "batch.approved", `Approved by ${approver.email} · ${rows.length} recipients`, approver.email, batch.approvedAt!);
    }
    if (["completed", "partial"].includes(opts.stage)) {
      await db.fundingTransaction.create({ data: { batchId: batch.id, chainId: 8453, fromAddress: org.treasuryAddress!, amount: total, assetSymbol: "USDC", status: "SIMULATED", simulated: true, note: "Simulated funding. No on-chain transfer occurred.", createdAt: batch.fundedAt!, confirmedAt: batch.fundedAt! } });
      await audit(batch.id, "funding.recorded", "Simulated funding recorded", finance.email, batch.fundedAt!);
      await audit(batch.id, "execution.started", `Execution started for ${rows.length} payment(s)`, finance.email, batch.executionStartedAt!);
    }
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const failed = opts.stage === "partial" && i % 7 === 3;
      const retry = opts.stage === "partial" && i % 7 === 5;
      const rstatus = opts.stage === "draft" ? "PENDING" : opts.stage === "approved" ? "ROUTED" : failed ? "FAILED" : retry ? "RETRY_ELIGIBLE" : "COMPLETED";
      const submittedAt = ["completed", "partial"].includes(opts.stage) ? new Date(batch.executionStartedAt!.getTime() + i * 9_000) : null;
      const completedAt = rstatus === "COMPLETED" ? new Date(submittedAt!.getTime() + 14_000) : null;
      const rec = await db.batchRecipient.create({ data: { batchId: batch.id, rowNumber: i + 1, name: r.name, addressInput: r.address, address: r.address, amountInput: AMOUNTS[i % AMOUNTS.length], amount: r.amount, assetSymbol: "USDC", reference: r.ref, valid: true, status: rstatus, attemptCount: rstatus === "PENDING" || rstatus === "ROUTED" ? 0 : 1, submittedAt, completedAt, lastError: failed ? "BLOCKED_WALLET: Recipient flagged by screening at fill time (simulated)" : retry ? "SOLVER_CAPACITY_EXCEEDED: Solver capacity exhausted; safe to retry (simulated)" : null, createdAt: opts.created } });
      if (opts.stage !== "draft") {
        const gas = "45696624454598";
        await db.paymentRoute.create({ data: { recipientId: rec.id, batchId: batch.id, provider: "mock", providerRequestId: "sim-q-" + hex(batch.id + rec.id, 24), routeKind: "direct_transfer", originChainId: 8453, destinationChainId: 8453, steps: JSON.stringify([{ id: "send", kind: "transaction", description: "Send funds to the recipient", chainId: 8453, to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", data: "0xa9059cbb", value: "0" }]), fees: JSON.stringify({ gas: { symbol: "ETH", amount: gas, amountFormatted: "0.00004570", amountUsd: "0.118811" }, relayer: { symbol: "USDC", amount: "0", amountFormatted: "0.000000", amountUsd: "0.000000" }, totalUsd: "0.118811" }), feeTotalUsd: "0.118811", amountIn: r.amount, timeEstimateSec: 4, quotedAt: new Date(opts.created.getTime() + 1_200_000), expiresAt: new Date(opts.created.getTime() + 2_100_000), status: rstatus === "ROUTED" ? "QUOTED" : "CONSUMED", raw: JSON.stringify({ simulated: true }) } });
      }
      if (submittedAt) {
        const txHash = "0x" + hex("fill:" + rec.id, 64);
        const st = rstatus === "COMPLETED" ? "CONFIRMED" : "FAILED";
        await db.executionAttempt.create({ data: { recipientId: rec.id, batchId: batch.id, attemptNo: 1, idempotencyKey: `exec:${batch.id}:${rec.id}:1`, provider: "mock", providerRequestId: "sim-tx-" + hex(rec.id, 32), txHash: st === "CONFIRMED" ? txHash : null, providerStatus: st === "CONFIRMED" ? "success" : "failure", status: st, failReason: failed ? "BLOCKED_WALLET" : retry ? "SOLVER_CAPACITY_EXCEEDED" : null, retryable: retry, simulated: true, log: JSON.stringify([{ at: submittedAt.toISOString(), event: "submitted (simulated)" }, { at: (completedAt ?? new Date(submittedAt.getTime() + 12_000)).toISOString(), event: st === "CONFIRMED" ? `success ${txHash}` : `failure ${failed ? "BLOCKED_WALLET" : "SOLVER_CAPACITY_EXCEEDED"}` }]), startedAt: submittedAt, finishedAt: completedAt ?? new Date(submittedAt.getTime() + 12_000) } });
        await db.reconciliationRecord.create({ data: { recipientId: rec.id, batchId: batch.id, organizationId: org.id, status: st === "CONFIRMED" ? (i % 5 === 0 ? "UNRECONCILED" : "MATCHED") : "EXCEPTION", txHash: st === "CONFIRMED" ? txHash : null, feeActual: st === "CONFIRMED" ? "0.118811" : null, note: failed ? "BLOCKED_WALLET" : retry ? "SOLVER_CAPACITY_EXCEEDED" : null, reconciledAt: completedAt } });
        await audit(batch.id, "payment.submitted", `Row ${i + 1} submitted (simulated)`, null, submittedAt, rec.id);
        await audit(batch.id, st === "CONFIRMED" ? "payment.completed" : "payment.failed", st === "CONFIRMED" ? `Row ${i + 1} completed (simulated)` : `Row ${i + 1} failed: ${failed ? "BLOCKED_WALLET" : "SOLVER_CAPACITY_EXCEEDED (retry eligible)"}`, null, completedAt ?? new Date(submittedAt.getTime() + 12_000), rec.id);
      }
    }
    if (opts.stage === "completed") await audit(batch.id, "batch.completed", `Batch completed: ${rows.length}/${rows.length} payments`, null, batch.completedAt!);
    if (opts.stage === "partial") await audit(batch.id, "batch.partially_failed", `Batch partially failed: ${rows.length - Math.ceil(rows.length / 7) * 2}/${rows.length} completed`, null, new Date(batch.executionStartedAt!.getTime() + rows.length * 9_000 + 20_000));
    return batch;
  }

  await makeBatch({ name: "July contractor payroll", reference: "2026-07", count: 14, stage: "completed", created: daysAgo(52) });
  await makeBatch({ name: "August contractor payroll", reference: "2026-08", count: 16, stage: "completed", created: daysAgo(21) });
  await makeBatch({ name: "September contractor payroll", reference: "2026-09", count: 16, stage: "partial", created: daysAgo(2, 5) });
  await makeBatch({ name: "Design retainer · Q3 true-up", reference: "2026-Q3-DES", count: 5, stage: "approved", created: daysAgo(0, 6) });
  await makeBatch({ name: "October contractor payroll (draft)", reference: "2026-10", count: 9, stage: "draft", created: daysAgo(0, 1) });

  await audit(null, "organization.created", "Organization “Northwind Labs” created (seed)", owner.email, daysAgo(60));
  console.log(`Seeded Northwind Labs. Sign in with any of:\n  owner@northwind.example\n  finance@northwind.example\n  approver@northwind.example\n  viewer@northwind.example\nPassword: ${PASSWORD}`);
}

main().finally(() => db.$disconnect());
