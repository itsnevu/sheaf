export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { handler, json, requireSession } from "@/lib/http";

export const GET = handler(async (req) => {
  const s = await requireSession("batch.view");
  const url = new URL(req.url);
  const type = url.searchParams.get("type"); // prefix filter, e.g. "payment" or "batch"
  const batchId = url.searchParams.get("batchId");
  const cursor = url.searchParams.get("cursor");
  const take = Math.min(100, Number(url.searchParams.get("limit") || 40));
  const events = await db.auditEvent.findMany({
    where: { organizationId: s.organizationId, ...(type ? { action: { startsWith: type } } : {}), ...(batchId ? { batchId } : {}) },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { batch: { select: { name: true } } },
  });
  const next = events.length > take ? events[take].id : null;
  return json({
    events: events.slice(0, take).map((e) => ({ id: e.id, action: e.action, summary: e.summary, actorEmail: e.actorEmail, batchId: e.batchId, batchName: e.batch?.name ?? null, recipientId: e.recipientId, createdAt: e.createdAt.toISOString() })),
    nextCursor: next,
  });
});
