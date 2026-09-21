/** Explicit lifecycle states. Transitions are enforced in src/lib/services/batches.ts. */

export const BATCH_STATUS = [
  "DRAFT",
  "VALIDATED",
  "ROUTES_PREPARED",
  "APPROVED",
  "FUNDED",
  "EXECUTING",
  "COMPLETED",
  "PARTIALLY_FAILED",
  "FAILED",
  "CANCELLED",
] as const;
export type BatchStatus = (typeof BATCH_STATUS)[number];

export const RECIPIENT_STATUS = [
  "PENDING",
  "ROUTED",
  "ROUTE_UNAVAILABLE",
  "SCHEDULED",
  "SUBMITTED",
  "CONFIRMING",
  "COMPLETED",
  "FAILED",
  "RETRY_ELIGIBLE",
  "REFUNDED",
  "CANCELLED",
] as const;
export type RecipientStatus = (typeof RECIPIENT_STATUS)[number];

export const ATTEMPT_STATUS = ["PENDING", "SUBMITTED", "CONFIRMED", "FAILED", "UNKNOWN", "REFUNDED"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUS)[number];

export const ROUTE_STATUS = ["QUOTED", "STALE", "UNAVAILABLE", "CONSUMED"] as const;
export type RouteStatus = (typeof ROUTE_STATUS)[number];

export const RECON_STATUS = ["UNRECONCILED", "MATCHED", "EXCEPTION", "RESOLVED"] as const;
export type ReconStatus = (typeof RECON_STATUS)[number];

export const ROLES = ["OWNER", "FINANCE_ADMIN", "APPROVER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

/** Batch statuses in which the recipient set may still be edited. */
export const EDITABLE_BATCH_STATUSES: BatchStatus[] = ["DRAFT", "VALIDATED", "ROUTES_PREPARED", "APPROVED"];

/** Terminal recipient states (never touched by the worker again). */
export const TERMINAL_RECIPIENT: RecipientStatus[] = ["COMPLETED", "FAILED", "REFUNDED", "CANCELLED"];

export const BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  DRAFT: ["VALIDATED", "CANCELLED", "DRAFT"],
  VALIDATED: ["ROUTES_PREPARED", "DRAFT", "VALIDATED", "CANCELLED"],
  ROUTES_PREPARED: ["APPROVED", "VALIDATED", "ROUTES_PREPARED", "DRAFT", "CANCELLED"],
  APPROVED: ["FUNDED", "ROUTES_PREPARED", "VALIDATED", "DRAFT", "CANCELLED"],
  FUNDED: ["EXECUTING", "CANCELLED"],
  EXECUTING: ["COMPLETED", "PARTIALLY_FAILED", "FAILED", "EXECUTING"],
  PARTIALLY_FAILED: ["EXECUTING", "COMPLETED", "PARTIALLY_FAILED"],
  COMPLETED: ["COMPLETED"],
  FAILED: ["EXECUTING", "FAILED"],
  CANCELLED: ["CANCELLED"],
};

export function canTransition(from: string, to: BatchStatus): boolean {
  return (BATCH_TRANSITIONS[from as BatchStatus] ?? []).includes(to);
}

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  VALIDATED: "Validated",
  ROUTES_PREPARED: "Routes prepared",
  APPROVED: "Approved",
  FUNDED: "Funded",
  EXECUTING: "Executing",
  COMPLETED: "Completed",
  PARTIALLY_FAILED: "Partially failed",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
  PENDING: "Pending",
  ROUTED: "Route ready",
  ROUTE_UNAVAILABLE: "Route unavailable",
  SCHEDULED: "Scheduled",
  SUBMITTED: "Submitted",
  CONFIRMING: "Confirming",
  RETRY_ELIGIBLE: "Retry eligible",
  REFUNDED: "Refunded",
  UNKNOWN: "Unknown",
  CONFIRMED: "Confirmed",
  UNRECONCILED: "Unreconciled",
  MATCHED: "Matched",
  EXCEPTION: "Exception",
  RESOLVED: "Resolved",
  QUOTED: "Quoted",
  STALE: "Stale",
  UNAVAILABLE: "Unavailable",
  CONSUMED: "Consumed",
  SIMULATED: "Simulated",
  OWNER: "Owner",
  FINANCE_ADMIN: "Finance admin",
  APPROVER: "Approver",
  VIEWER: "Viewer",
};

export function statusLabel(s: string | null | undefined): string {
  if (!s) return "—";
  return STATUS_LABEL[s] ?? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");
}

/** Tone used by the StatusBadge component. Never the only cue: labels are always shown. */
export type StatusTone = "neutral" | "info" | "progress" | "success" | "warning" | "danger";
export function statusTone(s: string | null | undefined): StatusTone {
  switch (s) {
    case "COMPLETED":
    case "CONFIRMED":
    case "MATCHED":
    case "RESOLVED":
    case "FUNDED":
    case "APPROVED":
      return "success";
    case "EXECUTING":
    case "SUBMITTED":
    case "CONFIRMING":
    case "SCHEDULED":
    case "RUNNING":
      return "progress";
    case "FAILED":
    case "CANCELLED":
    case "EXCEPTION":
    case "ROUTE_UNAVAILABLE":
    case "UNAVAILABLE":
      return "danger";
    case "PARTIALLY_FAILED":
    case "RETRY_ELIGIBLE":
    case "REFUNDED":
    case "STALE":
    case "UNKNOWN":
      return "warning";
    case "VALIDATED":
    case "ROUTES_PREPARED":
    case "ROUTED":
    case "QUOTED":
      return "info";
    default:
      return "neutral";
  }
}
