export const dynamic = "force-dynamic";
import { z } from "zod";
import { handler, json, readJson, requireSession } from "@/lib/http";
import { attemptDTO } from "@/lib/serialize";
import { recordSignedAttempt } from "@/lib/services/batches";

type Ctx = { params: { id: string; rid: string } };
const Body = z.object({ txHash: z.string().regex(/^0x[0-9a-fA-F]{64}$/), stepId: z.string().min(1).max(40) });

/** Real mode: the treasury wallet signed and broadcast a route step in the browser. */
export const POST = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("batch.execute");
  const body = Body.parse(await readJson(req));
  const attempt = await recordSignedAttempt(s, params.id, params.rid, body);
  return json({ attempt: attemptDTO(attempt) }, 201);
});
