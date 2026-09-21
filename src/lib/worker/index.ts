import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { executeRoute, pollRoute, prepareRoutes } from "./handlers";
import type { JobType } from "./queue";

const STALE_LOCK_MS = 5 * 60_000;

/**
 * Process up to `limit` due jobs. Safe to call concurrently from several processes: a job is
 * claimed with a conditional update, so only one caller can move it QUEUED → RUNNING.
 */
export async function processJobs(limit = 10, workerId = randomBytes(4).toString("hex")): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  const now = new Date();
  // Release locks abandoned by a crashed worker.
  await db.job.updateMany({ where: { status: "RUNNING", lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } }, data: { status: "QUEUED", lockedAt: null, lockedBy: null } });
  const due = await db.job.findMany({ where: { status: "QUEUED", runAt: { lte: now } }, orderBy: { runAt: "asc" }, take: limit });
  for (const job of due) {
    const claimed = await db.job.updateMany({ where: { id: job.id, status: "QUEUED" }, data: { status: "RUNNING", lockedAt: new Date(), lockedBy: workerId, attempts: { increment: 1 } } });
    if (claimed.count !== 1) continue;
    try {
      await run(job.type as JobType, job);
      await db.job.update({ where: { id: job.id }, data: { status: "DONE", lockedAt: null } });
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const exhausted = job.attempts + 1 >= job.maxAttempts;
      const backoff = Math.min(60_000, 2_000 * 2 ** job.attempts);
      await db.job.update({ where: { id: job.id }, data: { status: exhausted ? "FAILED" : "QUEUED", lockedAt: null, lastError: msg.slice(0, 500), runAt: new Date(Date.now() + backoff) } });
      console.error(`[worker] job ${job.type} ${job.id} failed (${job.attempts + 1}/${job.maxAttempts}): ${msg}`);
      failed++;
    }
  }
  return { processed, failed };
}

async function run(type: JobType, job: Parameters<typeof executeRoute>[0]) {
  switch (type) {
    case "prepare_routes":
      return prepareRoutes(job);
    case "execute_route":
      return executeRoute(job);
    case "poll_route":
      return pollRoute(job);
    default:
      throw new Error(`Unknown job type ${type}`);
  }
}

let loop: NodeJS.Timeout | undefined;
let running = false;

/** In-process ticker used in development and single-instance deployments. */
export function startInProcessWorker(intervalMs: number) {
  if (loop) return;
  const id = "inproc-" + randomBytes(3).toString("hex");
  loop = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processJobs(20, id);
    } catch (e) {
      console.error("[worker] tick error", e);
    } finally {
      running = false;
    }
  }, intervalMs);
  loop.unref?.();
  console.log(`[worker] in-process worker ${id} every ${intervalMs}ms`);
}
