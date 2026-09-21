export const dynamic = "force-dynamic";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { CSV_LIMITS } from "@/lib/csv/parse";
import { fail, handler, json, readJson, requireSession } from "@/lib/http";
import { importCsv, loadBatch } from "@/lib/services/batches";

type Ctx = { params: { id: string } };

const Body = z.object({ fileName: z.string().min(1).max(200), text: z.string().max(CSV_LIMITS.maxBytes * 2) });

/** Import + validate a CSV. Accepts JSON {fileName,text} or multipart with a "file" field. */
export const POST = handler<Ctx>(async (req, { params }) => {
  const s = await requireSession("batch.edit");
  let fileName: string;
  let text: string;
  const ct = req.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail(400, "Missing file", "NO_FILE");
    if (file.size > CSV_LIMITS.maxBytes) return fail(413, `File exceeds ${CSV_LIMITS.maxBytes / 1024 / 1024} MB`, "FILE_SIZE");
    fileName = file.name;
    text = await file.text();
  } else {
    const body = Body.parse(await readJson(req));
    fileName = body.fileName;
    text = body.text;
  }
  const summary = await importCsv(s, params.id, { fileName, text });
  return json({
    fileErrors: summary.fileErrors,
    header: summary.header,
    columns: summary.columns,
    validCount: summary.validCount,
    invalidCount: summary.invalidCount,
    totalAmount: summary.totalAmount,
    duplicateAddresses: summary.duplicateAddresses,
  });
});

/** Original CSV for audit (Owner / Finance admin only). */
export const GET = handler<Ctx>(async (_req, { params }) => {
  const s = await requireSession("csv.viewOriginal");
  const batch = await loadBatch(s, params.id);
  if (!batch.csvOriginal) return fail(404, "No CSV has been imported for this batch");
  await audit({ organizationId: s.organizationId, batchId: batch.id, actorId: s.userId, actorEmail: s.email, action: "csv.downloaded", summary: `Original CSV downloaded (${batch.csvFileName})` });
  return new Response(batch.csvOriginal, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${(batch.csvFileName ?? "batch.csv").replace(/"/g, "")}"` } });
});
