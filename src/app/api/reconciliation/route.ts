export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { handler, json, requireSession } from "@/lib/http";
import { recipientDTO } from "@/lib/serialize";

export const GET = handler(async (req) => {
  const s = await requireSession("batch.view");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const status = url.searchParams.get("status"); // payment status
  const recon = url.searchParams.get("recon"); // reconciliation status
  const batchId = url.searchParams.get("batchId");
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Number(url.searchParams.get("pageSize") || 25));
  const where = {
    batch: { organizationId: s.organizationId, status: { notIn: ["DRAFT", "VALIDATED", "ROUTES_PREPARED"] } },
    valid: true,
    ...(batchId ? { batchId } : {}),
    ...(status ? { status } : {}),
    ...(recon ? (recon === "UNRECONCILED" ? { OR: [{ reconciliation: null }, { reconciliation: { status: "UNRECONCILED" } }] } : { reconciliation: { status: recon } }) : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { address: { contains: q } },
            { reference: { contains: q } },
            { attempts: { some: { txHash: { contains: q } } } },
            { batch: { name: { contains: q } } },
          ],
        }
      : {}),
  };
  const [total, rows] = await Promise.all([
    db.batchRecipient.count({ where }),
    db.batchRecipient.findMany({ where, orderBy: [{ batch: { createdAt: "desc" } }, { rowNumber: "asc" }], skip: (page - 1) * pageSize, take: pageSize, include: { route: true, reconciliation: true, batch: { select: { name: true, id: true, mode: true, assetDecimals: true } }, attempts: { orderBy: { attemptNo: "desc" }, take: 1 } } }),
  ]);
  return json({
    total,
    page,
    pageSize,
    rows: rows.map((r) => ({ ...recipientDTO(r, s.role), batchName: r.batch.name, batchMode: r.batch.mode, assetDecimals: r.batch.assetDecimals, txHash: r.attempts[0]?.txHash ?? null, simulated: r.attempts[0]?.simulated ?? false })),
  });
});
