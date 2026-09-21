export const dynamic = "force-dynamic";
import { handler, json, requireSession } from "@/lib/http";
import { startExecution } from "@/lib/services/batches";

type Ctx = { params: { id: string } };

/** Idempotent: calling twice while executing is a no-op. */
export const POST = handler<Ctx>(async (_req, { params }) => {
  const s = await requireSession("batch.execute");
  const result = await startExecution(s, params.id);
  return json(result, result.started ? 202 : 200);
});
