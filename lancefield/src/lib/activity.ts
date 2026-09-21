import { db } from "./db";

export function logActivity(input: { action: string; summary: string; briefId?: string | null; agentId?: string | null }) {
  return db.activityEvent.create({ data: { action: input.action, summary: input.summary, briefId: input.briefId ?? null, agentId: input.agentId ?? null } });
}
