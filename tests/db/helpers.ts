import { db } from "@/lib/db";
import type { SessionContext } from "@/lib/auth/session";

/** Test fixtures against the SQLite test database. Each call creates an isolated organisation. */

let counter = 0;

export async function makeOrg(overrides: Partial<{ requireFourEyes: boolean; maxRetries: number; treasuryAddress: string | null }> = {}) {
  const n = ++counter;
  const org = await db.organization.create({ data: { name: `Org ${n}`, slug: `org-${n}-${Date.now().toString(36)}`, requireFourEyes: overrides.requireFourEyes ?? true, maxRetries: overrides.maxRetries ?? 3, treasuryAddress: overrides.treasuryAddress ?? "0x00000000000000000000000000000000000000a1" } });
  const mk = async (role: SessionContext["role"]): Promise<SessionContext> => {
    const u = await db.user.create({ data: { name: role, email: `${role.toLowerCase()}-${n}-${Math.random().toString(36).slice(2, 7)}@test.example`, passwordHash: "x" } });
    await db.membership.create({ data: { userId: u.id, organizationId: org.id, role } });
    return { userId: u.id, email: u.email, name: u.name, organizationId: org.id, organizationName: org.name, organizationSlug: org.slug, role, sessionId: "s" };
  };
  return { org, owner: await mk("OWNER"), finance: await mk("FINANCE_ADMIN"), approver: await mk("APPROVER"), viewer: await mk("VIEWER") };
}

export const ADDR = (i: number) => "0x" + (i + 1).toString(16).padStart(40, "0");

export function csvOf(rows: Array<{ name: string; address: string; amount: string; reference?: string }>) {
  return "name,address,amount,asset,reference\n" + rows.map((r) => `${r.name},${r.address},${r.amount},USDC,${r.reference ?? ""}`).join("\n") + "\n";
}

export async function auditActions(batchId: string) {
  const rows = await db.auditEvent.findMany({ where: { batchId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => r.action);
}
