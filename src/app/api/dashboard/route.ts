export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { executionMode } from "@/lib/config";
import { handler, json, requireSession } from "@/lib/http";
import { batchDTO } from "@/lib/serialize";

export const GET = handler(async () => {
  const s = await requireSession("batch.view");
  const org = s.organizationId;
  const [totalBatches, activeBatches, byStatus, recent, events, org$] = await Promise.all([
    db.paymentBatch.count({ where: { organizationId: org, status: { not: "CANCELLED" } } }),
    db.paymentBatch.count({ where: { organizationId: org, status: { in: ["EXECUTING", "FUNDED", "APPROVED"] } } }),
    db.batchRecipient.groupBy({ by: ["status"], where: { valid: true, batch: { organizationId: org, status: { notIn: ["DRAFT", "VALIDATED", "ROUTES_PREPARED", "CANCELLED"] } } }, _count: { _all: true } }),
    db.paymentBatch.findMany({ where: { organizationId: org }, orderBy: { updatedAt: "desc" }, take: 6, include: { _count: { select: { recipients: true } } } }),
    db.auditEvent.findMany({ where: { organizationId: org }, orderBy: { createdAt: "desc" }, take: 12, include: { batch: { select: { name: true } } } }),
    db.organization.findUniqueOrThrow({ where: { id: org } }),
  ]);
  const count = (statuses: string[]) => byStatus.filter((b) => statuses.includes(b.status)).reduce((a, b) => a + b._count._all, 0);
  const totalLegs = byStatus.reduce((a, b) => a + b._count._all, 0);
  return json({
    mode: executionMode(),
    assetSymbol: org$.assetSymbol,
    assetDecimals: org$.assetDecimals,
    stats: {
      totalBatches,
      activeBatches,
      totalLegs,
      completed: count(["COMPLETED"]),
      pending: count(["ROUTED", "SCHEDULED", "SUBMITTED", "CONFIRMING", "PENDING"]),
      failed: count(["FAILED", "REFUNDED"]),
      retryEligible: count(["RETRY_ELIGIBLE"]),
    },
    recentBatches: recent.map(batchDTO),
    recentEvents: events.map((e) => ({ id: e.id, action: e.action, summary: e.summary, actorEmail: e.actorEmail, batchId: e.batchId, batchName: e.batch?.name ?? null, createdAt: e.createdAt.toISOString() })),
  });
});
