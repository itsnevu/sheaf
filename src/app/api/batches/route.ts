export const dynamic = "force-dynamic";
import { z } from "zod";
import { db } from "@/lib/db";
import { handler, json, readJson, requireSession } from "@/lib/http";
import { batchDTO } from "@/lib/serialize";
import { createBatch } from "@/lib/services/batches";

export const GET = handler(async (req) => {
  const s = await requireSession("batch.view");
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const q = url.searchParams.get("q")?.trim();
  const take = Math.min(100, Number(url.searchParams.get("limit") || 50));
  const batches = await db.paymentBatch.findMany({
    where: { organizationId: s.organizationId, ...(status ? { status } : {}), ...(q ? { OR: [{ name: { contains: q } }, { reference: { contains: q } }, { id: { contains: q } }] } : {}) },
    orderBy: { createdAt: "desc" },
    take,
    include: { _count: { select: { recipients: true } } },
  });
  return json({ batches: batches.map(batchDTO) });
});

const Create = z.object({ name: z.string().min(1).max(120), reference: z.string().max(120).optional().nullable(), deadlineAt: z.string().optional().nullable(), jitterMaxSeconds: z.number().int().min(0).max(1800).optional().nullable() });

export const POST = handler(async (req) => {
  const s = await requireSession("batch.create");
  const body = Create.parse(await readJson(req));
  const batch = await createBatch(s, body);
  return json({ batch: batchDTO(batch) }, 201);
});
