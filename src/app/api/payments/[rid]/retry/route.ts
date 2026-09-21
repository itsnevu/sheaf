export const dynamic = "force-dynamic";
import { handler, json, requireSession } from "@/lib/http";
import { retryPayment } from "@/lib/services/batches";

type Ctx = { params: { rid: string } };

export const POST = handler<Ctx>(async (_req, { params }) => {
  const s = await requireSession("payment.retry");
  await retryPayment(s, params.rid);
  return json({ ok: true }, 202);
});
