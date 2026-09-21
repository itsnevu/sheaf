export const dynamic = "force-dynamic";
import { handler, json, requireSession } from "@/lib/http";
import { requestRoutePreparation } from "@/lib/services/batches";

type Ctx = { params: { id: string } };

export const POST = handler<Ctx>(async (_req, { params }) => {
  const s = await requireSession("batch.prepare");
  await requestRoutePreparation(s, params.id);
  return json({ ok: true, queued: true }, 202);
});
