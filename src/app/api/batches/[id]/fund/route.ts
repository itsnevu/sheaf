export const dynamic = "force-dynamic";
import { z } from "zod";
import { handler, json, readJson, requireSession } from "@/lib/http";
import { fundBatch } from "@/lib/services/batches";

type Ctx = { params: { id: string } };
const Body = z.object({ fromAddress: z.string().optional(), txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/).optional().nullable(), attestedBalance: z.string().regex(/^\d+$/).optional().nullable() });

export const POST = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("batch.fund");
  const body = Body.parse(await readJson(req).catch(() => ({})));
  const f = await fundBatch(s, params.id, body);
  return json({ funding: { id: f.id, status: f.status, simulated: f.simulated, amount: f.amount, fromAddress: f.fromAddress } }, 201);
});
