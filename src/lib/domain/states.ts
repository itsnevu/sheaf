/**
 * Explicit lifecycle states. Transitions are enforced in src/lib/services/batches.ts.
 *
 * Vocabulary: an "operation" (a sheaf) is stored as a PaymentBatch; each "leg" of it is a
 * BatchRecipient. Model names and status values are kept; labels are the product vocabulary.
 */

/** The four operation kinds, each backed by a contract in contracts/ (referenced by name only). */
export const OPERATION_KIND = ["CLAIM", "ACCUMULATE", "OTC", "TREASURY"] as const;
export type OperationKind = (typeof OPERATION_KIND)[number];

export const OPERATION_KIND_INFO: Record<OperationKind, { label: string; contract: string; summary: string; legs: string; legLabel: string; legAddressLabel: string }> = {
  CLAIM: {
    label: "Private allocation claim",
    contract: "PrivateClaim",
    summary: "An eligible account claims an allocation into a fresh recipient, so the eligible wallet is not the destination on-chain.",
    legs: "One leg per claim: eligible account → fresh recipient, amount.",
    legLabel: "Eligible account",
    legAddressLabel: "Fresh recipient",
  },
  ACCUMULATE: {
    label: "Stealth accumulation",
    contract: "StealthDesk",
    summary: "A plan of fresh recipients, amounts and not-before times, committed as a Merkle root and executed one leg at a time.",
    legs: "One leg per tranche: fresh recipient, amount, not-before.",
    legLabel: "Tranche",
    legAddressLabel: "Fresh recipient",
  },
  OTC: {
    label: "Private OTC block",
    contract: "OtcEscrow",
    summary: "A single block against one counterparty: give asset and amount, want asset and amount, expiry, and the address to receive into.",
    legs: "A single leg: counterparty, give amount; memo carries the want side and the receive-into address.",
    legLabel: "Counterparty",
    legAddressLabel: "Counterparty address",
  },
  TREASURY: {
    label: "Delegated treasury",
    contract: "DelegatedTreasury",
    summary: "Delegated payouts under a daily cap. The proposer is never the approver.",
    legs: "One leg per payout: to, token, amount.",
    legLabel: "Payee",
    legAddressLabel: "Destination",
  },
};

export function operationKindLabel(kind: string | null | undefined): string {
  return OPERATION_KIND_INFO[kind as OperationKind]?.label ?? kind ?? "Operation";
}

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

/** Operation statuses in which the leg set may still be edited. */
export const EDITABLE_BATCH_STATUSES: BatchStatus[] = ["DRAFT", "VALIDATED", "ROUTES_PREPARED", "APPROVED"];

/** Terminal leg states (never touched by the worker again). */
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
  FINANCE_ADMIN: "Desk operator",
  APPROVER: "Approver",
  VIEWER: "Viewer",
  CLAIM: "Private allocation claim",
  ACCUMULATE: "Stealth accumulation",
  OTC: "Private OTC block",
  TREASURY: "Delegated treasury",
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
