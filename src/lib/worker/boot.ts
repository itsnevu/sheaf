import "server-only";

/**
 * Starts the in-process worker once per server process. Called from the root layout so it
 * boots with the first request. Set WORKER_MODE=off and trigger POST /api/worker/run from a
 * scheduler on serverless or multi-instance hosts.
 */
const g = globalThis as unknown as { __sheafWorkerBooted?: boolean };

export async function ensureWorker() {
  if (g.__sheafWorkerBooted) return;
  if ((process.env.WORKER_MODE ?? "in-process") !== "in-process") return;
  g.__sheafWorkerBooted = true;
  const { startInProcessWorker } = await import("./index");
  startInProcessWorker(Number(process.env.WORKER_INTERVAL_MS || 2000));
}
