export const dynamic = "force-dynamic";
import { z } from "zod";
import { handler, json, readJson, requireSession } from "@/lib/http";
import { approveBatch, revokeApproval } from "@/lib/services/batches";

type Ctx = { params: { id: string } };
const Body = z.object({ note: z.string().max(500).optional().nullable(), confirmTotal: z.string().optional() });

export const POST = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("batch.approve");
  const body = Body.parse(await readJson(req));
  const approval = await approveBatch(s, params.id, body.note);
  return json({ approval: { id: approval.id, createdAt: approval.createdAt.toISOString(), recipientSetHash: approval.recipientSetHash, totalAmount: approval.totalAmount } }, 201);
});

export const DELETE = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("batch.approve");
  const reason = new URL(req.url).searchParams.get("reason") ?? "";
  await revokeApproval(s, params.id, reason);
  return json({ ok: true });
});
