export const dynamic = "force-dynamic";
import { z } from "zod";
import { db } from "@/lib/db";
import { can } from "@/lib/auth/permissions";
import { handler, json, readJson, requireSession } from "@/lib/http";
import { batchDTO, recipientDTO } from "@/lib/serialize";
import { cancelBatch, loadBatch, updateBatchDetails } from "@/lib/services/batches";
import { sumUnits, sumUsd } from "@/lib/money";

type Ctx = { params: { id: string } };

export const GET = handler<Ctx>(async (_req, { params }) => {
  const s = await requireSession("batch.view");
  const batch = await loadBatch(s, params.id);
  const [recipients, approvals, funding, events] = await Promise.all([
    db.batchRecipient.findMany({ where: { batchId: batch.id }, orderBy: { rowNumber: "asc" }, include: { route: true, reconciliation: true } }),
    db.approval.findMany({ where: { batchId: batch.id }, orderBy: { createdAt: "desc" } }),
    db.fundingTransaction.findMany({ where: { batchId: batch.id }, orderBy: { createdAt: "desc" } }),
    db.auditEvent.findMany({ where: { batchId: batch.id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const routes = recipients.map((r) => r.route).filter(Boolean);
  const quoted = routes.filter((r) => r!.status === "QUOTED" || r!.status === "CONSUMED");
  const summary = {
    recipients: recipients.length,
    valid: recipients.filter((r) => r.valid).length,
    invalid: recipients.filter((r) => !r.valid).length,
    routed: routes.filter((r) => r!.status === "QUOTED").length,
    routeUnavailable: routes.filter((r) => r!.status === "UNAVAILABLE").length,
    completed: recipients.filter((r) => r.status === "COMPLETED").length,
    failed: recipients.filter((r) => ["FAILED", "REFUNDED"].includes(r.status)).length,
    retryEligible: recipients.filter((r) => r.status === "RETRY_ELIGIBLE").length,
    inFlight: recipients.filter((r) => ["SCHEDULED", "SUBMITTED", "CONFIRMING"].includes(r.status)).length,
    feeEstimateUsd: quoted.length ? sumUsd(quoted.map((r) => r!.feeTotalUsd)) : null,
    fundingRequired: quoted.length ? sumUnits(quoted.map((r) => r!.amountIn)).toString() : null,
    feesComplete: recipients.filter((r) => r.valid).every((r) => r.route && r.route.status !== "UNAVAILABLE"),
    directTransferRoutes: routes.filter((r) => r!.routeKind === "direct_transfer" && r!.status !== "UNAVAILABLE").length,
  };
  return json({
    batch: batchDTO(batch),
    summary,
    recipients: recipients.map((r) => recipientDTO(r, s.role)),
    approvals: approvals.map((a) => ({ id: a.id, approverEmail: a.approverEmail, status: a.status, note: a.note, totalAmount: a.totalAmount, recipientSetHash: a.recipientSetHash, createdAt: a.createdAt.toISOString(), invalidatedAt: a.invalidatedAt?.toISOString() ?? null, invalidatedReason: a.invalidatedReason })),
    funding: funding.map((f) => ({ id: f.id, chainId: f.chainId, fromAddress: can(s.role, "recipient.viewFullAddress") ? f.fromAddress : f.fromAddress.slice(0, 6) + "…", txHash: f.txHash, amount: f.amount, assetSymbol: f.assetSymbol, status: f.status, simulated: f.simulated, note: f.note, createdAt: f.createdAt.toISOString() })),
    events: events.map((e) => ({ id: e.id, action: e.action, summary: e.summary, actorEmail: e.actorEmail, recipientId: e.recipientId, createdAt: e.createdAt.toISOString() })),
    canEdit: can(s.role, "batch.edit"),
  });
});

const Patch = z.object({ name: z.string().min(1).max(120).optional(), reference: z.string().max(120).nullable().optional(), deadlineAt: z.string().nullable().optional(), jitterMaxSeconds: z.number().int().min(0).max(1800).nullable().optional() });

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("batch.edit");
  const body = Patch.parse(await readJson(req));
  const batch = await updateBatchDetails(s, params.id, body);
  return json({ batch: batchDTO(batch) });
});

export const DELETE = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("batch.edit");
  const reason = new URL(req.url).searchParams.get("reason") ?? "";
  await cancelBatch(s, params.id, reason);
  return json({ ok: true });
});
