export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { executionMode } from "@/lib/config";

export async function GET() {
  const queued = await db.job.count({ where: { status: "QUEUED" } }).catch(() => -1);
  return Response.json({ ok: queued >= 0, mode: executionMode(), queuedJobs: queued, time: new Date().toISOString() });
}
