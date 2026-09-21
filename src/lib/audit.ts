import { db } from "@/lib/db";

export interface AuditInput {
  organizationId: string;
  action: string;
  summary: string;
  batchId?: string | null;
  recipientId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  payload?: Record<string, unknown>;
}

/** Append-only by convention: nothing in the codebase updates or deletes AuditEvent rows. */
export async function audit(input: AuditInput) {
  return db.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      batchId: input.batchId ?? null,
      recipientId: input.recipientId ?? null,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? (input.actorId ? null : "system"),
      action: input.action,
      summary: input.summary,
      payload: JSON.stringify(input.payload ?? {}),
    },
  });
}
