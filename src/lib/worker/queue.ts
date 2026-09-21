import { db } from "@/lib/db";

export type JobType = "prepare_routes" | "execute_route" | "poll_route";

export async function enqueue(input: { type: JobType; batchId?: string; recipientId?: string; idempotencyKey: string; runAt?: Date; payload?: Record<string, unknown>; maxAttempts?: number }) {
  return db.job.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {},
    create: {
      type: input.type,
      batchId: input.batchId,
      recipientId: input.recipientId,
      idempotencyKey: input.idempotencyKey,
      runAt: input.runAt ?? new Date(),
      payload: JSON.stringify(input.payload ?? {}),
      maxAttempts: input.maxAttempts ?? 5,
    },
  });
}
