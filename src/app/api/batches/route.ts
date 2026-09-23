export const dynamic = "force-dynamic";
import { z } from "zod";
import { db } from "@/lib/db";
import { handler, json, readJson, requireSession } from "@/lib/http";
import { OPERATION_KIND } from "@/lib/domain/states";
import { batchDTO } from "@/lib/serialize";
import { createBatch } from "@/lib/services/batches";

export const GET = handler(async (req) => {
  const s = await requireSession("batch.view");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const kind = url.searchParams.get("kind");
  const q = url.searchParams.get("q")?.trim();
  const take = Math.min(100, Number(url.searchParams.get("limit") || 50));
  const batches = await db.paymentBatch.findMany({
    where: { organizationId: s.organizationId, ...(status ? { status } : {}), ...(kind ? { kind } : {}), ...(q ? { OR: [{ name: { contains: q } }, { reference: { contains: q } }, { id: { contains: q } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    include: { _count: { select: { recipients: true } } },
  });
  return json({ batches: batches.map(batchDTO) });
});

/** Creates an operation. `kind` is one of CLAIM | ACCUMULATE | OTC | TREASURY (default ACCUMULATE). */
const Create = z.object({ name: z.string().min(1).max(120), kind: z.enum(OPERATION_KIND).optional().nullable(), reference: z.string().max(120).optional().nullable(), deadlineAt: z.string().optional().nullable(), jitterMaxSeconds: z.number().int().min(0).max(1800).optional().nullable() });

export const POST = handler(async (req) => {
  const s = await requireSession("batch.create");
  const body = Create.parse(await readJson(req));
  const batch = await createBatch(s, body);
  return json({ batch: batchDTO(batch) }, 201);
});
