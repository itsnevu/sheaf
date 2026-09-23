export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { chainName, txUrl } from "@/lib/config";
import { fail, handler, requireSession } from "@/lib/http";
import { formatUnits } from "@/lib/money";

function cell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Reconciliation export. Always includes a `simulated` column so demo rows can never be
 * mistaken for real settlements in an accounting system.
 */
export const GET = handler(async (req) => {
  const s = await requireSession("export.download");
  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId");
  const format = url.searchParams.get("format") ?? "csv";
  if (format !== "csv") return fail(400, "Only csv is supported");
  const rows = await db.batchRecipient.findMany({
    where: { batch: { organizationId: s.organizationId, ...(batchId ? { id: batchId } : { status: { notIn: ["DRAFT", "VALIDATED", "ROUTES_PREPARED"] } }) }, valid: true },
    orderBy: [{ batch: { createdAt: "desc" } }, { rowNumber: "asc" }],
    include: { batch: true, route: true, reconciliation: true, attempts: { orderBy: { attemptNo: "desc" } } },
  });
  const header = ["operation_id", "operation_name", "operation_kind", "operation_reference", "mode", "simulated", "leg", "leg_label", "leg_address", "amount", "asset", "network", "not_before", "memo", "leg_status", "reconciliation_status", "route_kind", "provider_request_id", "tx_hash", "explorer_url", "attempts", "last_fail_reason", "fee_estimate_usd", "fee_actual_usd", "approved_at", "submitted_at", "completed_at", "reconciliation_note"];
  const lines = [header.join(",")];
  for (const r of rows) {
    const last = r.attempts[0];
    const confirmed = r.attempts.find((a) => a.status === "CONFIRMED");
    const tx = confirmed?.txHash ?? last?.txHash ?? null;
    lines.push(
      [
        r.batchId,
        r.batch.name,
        r.batch.kind,
        r.batch.reference,
        r.batch.mode,
        r.batch.mode === "demo" ? "true" : "false",
        r.rowNumber,
        r.name,
        r.address,
        r.amount ? formatUnits(r.amount, r.batch.assetDecimals).replace(/,/g, "") : "",
        r.assetSymbol,
        chainName(r.batch.destinationChainId),
        r.notBefore?.toISOString(),
        r.reference,
        r.status,
        r.reconciliation?.status ?? "UNRECONCILED",
        r.route?.routeKind,
        r.route?.providerRequestId,
        tx,
        tx && r.batch.mode === "real" ? txUrl(r.batch.destinationChainId, tx) : "",
        r.attemptCount,
        last?.failReason,
        r.route?.feeTotalUsd,
        r.reconciliation?.feeActual,
        r.batch.approvedAt?.toISOString(),
        r.submittedAt?.toISOString(),
        r.completedAt?.toISOString(),
        r.reconciliation?.note,
      ]
        .map(cell)
        .join(","),
    );
  }
  await audit({ organizationId: s.organizationId, batchId: batchId ?? null, actorId: s.userId, actorEmail: s.email, action: "export.downloaded", summary: `Reconciliation export downloaded (${rows.length} rows${batchId ? ", one operation" : ""})`, payload: { rows: rows.length, batchId } });
  const name = batchId ? `sheaf-operation-${batchId}.csv` : `sheaf-reconciliation-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(lines.join("\n") + "\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}"` } });
});
