import "server-only";
import { assertConfig } from "@/lib/env";

/**
 * Per-process boot: validates configuration and starts the in-process worker once. Called from
 * the root layout so it runs with the first request. Set WORKER_MODE=off and trigger
 * POST /api/worker/run from a scheduler on serverless or multi-instance hosts.
 */
const g = globalThis as unknown as { __sheafWorkerBooted?: boolean };

export async function ensureWorker() {
  // next build renders pages with NODE_ENV=production; nothing should boot or be validated then.
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  assertConfig();
  if (g.__sheafWorkerBooted) return;
  if ((process.env.WORKER_MODE ?? "in-process") !== "in-process") return;
  g.__sheafWorkerBooted = true;
  const { startInProcessWorker } = await import("./index");
  startInProcessWorker(Number(process.env.WORKER_INTERVAL_MS || 2000));
}
