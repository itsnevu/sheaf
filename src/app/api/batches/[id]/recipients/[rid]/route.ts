export const dynamic = "force-dynamic";
import { z } from "zod";
import { handler, json, readJson, requireSession } from "@/lib/http";
import { recipientDTO } from "@/lib/serialize";
import { removeRecipient, updateRecipient } from "@/lib/services/batches";

type Ctx = { params: { id: string; rid: string } };

/** Edits one leg: label (name), address, amount, memo (reference) and not-before time. */
const Patch = z.object({ name: z.string().max(120).optional(), address: z.string().max(80).optional(), amount: z.string().max(40).optional(), reference: z.string().max(200).nullable().optional(), notBefore: z.string().max(40).nullable().optional() });

export const PATCH = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("batch.edit");
  const body = Patch.parse(await readJson(req));
  const r = await updateRecipient(s, params.id, params.rid, body);
  return json({ recipient: recipientDTO(r, s.role) });
});

export const DELETE = handler<Ctx>(async (_req, { params }) => {
  const s = await requireSession("batch.edit");
  await removeRecipient(s, params.id, params.rid);
  return json({ ok: true });
});
