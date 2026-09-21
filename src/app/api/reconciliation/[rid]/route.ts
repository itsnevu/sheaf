export const dynamic = "force-dynamic";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { RECON_STATUS } from "@/lib/domain/states";
import { fail, handler, json, readJson, requireSession } from "@/lib/http";

type Ctx = { params: { rid: string } };
const Body = z.object({ status: z.enum(RECON_STATUS), note: z.string().max(500).optional().nullable() });

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("reconciliation.edit");
  const body = Body.parse(await readJson(req));
  const r = await db.batchRecipient.findFirst({ where: { id: params.rid, batch: { organizationId: s.organizationId } }, include: { attempts: { orderBy: { attemptNo: "desc" }, take: 1 } } });
  if (!r) return fail(404, "Payment not found");
  const rec = await db.reconciliationRecord.upsert({
    where: { recipientId: r.id },
    update: { status: body.status, note: body.note ?? undefined, reconciledById: s.userId, reconciledAt: new Date() },
    create: { recipientId: r.id, batchId: r.batchId, organizationId: s.organizationId, status: body.status, note: body.note ?? null, txHash: r.attempts[0]?.txHash ?? null, reconciledById: s.userId, reconciledAt: new Date() },
  });
  await audit({ organizationId: s.organizationId, batchId: r.batchId, recipientId: r.id, actorId: s.userId, actorEmail: s.email, action: "reconciliation.updated", summary: `Row ${r.rowNumber} marked ${body.status.toLowerCase()}${body.note ? `: ${body.note}` : ""}` });
  return json({ reconciliation: { status: rec.status, note: rec.note, reconciledAt: rec.reconciledAt?.toISOString() ?? null } });
});
