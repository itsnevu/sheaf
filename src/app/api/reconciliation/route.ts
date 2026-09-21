export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { handler, json, requireSession } from "@/lib/http";
import { recipientDTO } from "@/lib/serialize";

/** Upper bound on rows scanned for a free-text search (names and references are encrypted at rest). */
const SEARCH_SCAN_LIMIT = 5000;

const INCLUDE = { route: true, reconciliation: true, batch: { select: { name: true, id: true, mode: true, assetDecimals: true } }, attempts: { orderBy: { attemptNo: "desc" as const }, take: 1 } };
const ORDER = [{ batch: { createdAt: "desc" as const } }, { rowNumber: "asc" as const }];

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
  };

  let total: number;
  let rows: Awaited<ReturnType<typeof db.batchRecipient.findMany<{ include: typeof INCLUDE }>>>;
  if (q) {
    // Names and references are encrypted at rest, so the text match runs after decryption.
    const needle = q.toLowerCase();
    const scanned = await db.batchRecipient.findMany({ where, orderBy: ORDER, take: SEARCH_SCAN_LIMIT, include: INCLUDE });
    const matched = scanned.filter((r) =>
      [r.name, r.reference, r.address, r.addressInput, r.batch.name, r.attempts[0]?.txHash].some((v) => v && v.toLowerCase().includes(needle)),
    );
    total = matched.length;
    rows = matched.slice((page - 1) * pageSize, page * pageSize);
  } else {
    [total, rows] = await Promise.all([
      db.batchRecipient.count({ where }),
      db.batchRecipient.findMany({ where, orderBy: ORDER, skip: (page - 1) * pageSize, take: pageSize, include: INCLUDE }),
    ]);
  }
  return json({
    total,
    page,
    pageSize,
    rows: rows.map((r) => ({ ...recipientDTO(r, s.role), batchName: r.batch.name, batchMode: r.batch.mode, assetDecimals: r.batch.assetDecimals, txHash: r.attempts[0]?.txHash ?? null, simulated: r.attempts[0]?.simulated ?? false })),
  });
});
