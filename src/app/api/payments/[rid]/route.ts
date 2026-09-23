export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { fail, handler, json, requireSession } from "@/lib/http";
import { batchDTO, recipientDTO } from "@/lib/serialize";

type Ctx = { params: { rid: string } };

export const GET = handler<Ctx>(async (_req, { params }) => {
  const s = await requireSession("batch.view");
  const r = await db.batchRecipient.findFirst({
    where: { id: params.rid, batch: { organizationId: s.organizationId } },
    include: { batch: true, route: true, reconciliation: true, attempts: { orderBy: { attemptNo: "asc" } } },
  });
  if (!r) return fail(404, "Leg not found");
  const events = await db.auditEvent.findMany({ where: { recipientId: r.id }, orderBy: { createdAt: "asc" } });
  return json({ payment: recipientDTO(r, s.role), batch: batchDTO(r.batch), events: events.map((e) => ({ id: e.id, action: e.action, summary: e.summary, actorEmail: e.actorEmail, createdAt: e.createdAt.toISOString() })) });
});
