import type { Role } from "@/lib/domain/states";

/**
 * Capability matrix. Checked on the server in every API route and server page.
 * The UI hides controls for convenience only.
 */
export type Capability =
  | "batch.view"
  | "batch.create"
  | "batch.edit"
  | "batch.prepare"
  | "batch.approve"
  | "batch.fund"
  | "batch.execute"
  | "payment.retry"
  | "recipient.viewFullAddress"
  | "csv.viewOriginal"
  | "reconciliation.edit"
  | "export.download"
  | "settings.edit"
  | "members.manage";

const MATRIX: Record<Role, Capability[]> = {
  OWNER: [
    "batch.view",
    "batch.create",
    "batch.edit",
    "batch.prepare",
    "batch.approve",
    "batch.fund",
    "batch.execute",
    "payment.retry",
    "recipient.viewFullAddress",
    "csv.viewOriginal",
    "reconciliation.edit",
    "export.download",
    "settings.edit",
    "members.manage",
  ],
  FINANCE_ADMIN: [
    "batch.view",
    "batch.create",
    "batch.edit",
    "batch.prepare",
    "batch.fund",
    "batch.execute",
    "payment.retry",
    "recipient.viewFullAddress",
    "csv.viewOriginal",
    "reconciliation.edit",
    "export.download",
  ],
  APPROVER: ["batch.view", "batch.approve", "recipient.viewFullAddress", "export.download"],
  VIEWER: ["batch.view"],
};

export function can(role: Role, capability: Capability): boolean {
  return MATRIX[role]?.includes(capability) ?? false;
}

export function capabilitiesFor(role: Role): Capability[] {
  return MATRIX[role] ?? [];
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have permission to do this") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: Role, capability: Capability, message?: string): void {
  if (!can(role, capability)) throw new ForbiddenError(message);
}
