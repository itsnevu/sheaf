import { fail, handler, json } from "@/lib/http";
import { processJobs } from "@/lib/worker";

/** External trigger for cron-based deployments: POST with `x-worker-secret`. */
export const POST = handler(async (req) => {
  const secret = process.env.WORKER_SECRET;
  if (!secret || req.headers.get("x-worker-secret") !== secret) return fail(401, "Bad worker secret");
  const result = await processJobs(50, "http-" + Date.now().toString(36));
  return json(result);
});
