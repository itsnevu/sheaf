import type { BatchRecipient, ExecutionAttempt, PaymentBatch, PaymentRoute, ReconciliationRecord } from "@prisma/client";
import { redactAddress } from "@/lib/address";
import { can } from "@/lib/auth/permissions";
import type { Role } from "@/lib/domain/states";

/**
 * Shapes sent to the browser. Addresses are redacted for roles without the capability.
 * Naming: a "batch" DTO is an operation; a "recipient" DTO is one leg of it.
 */

export type RecipientDTO = ReturnType<typeof recipientDTO>;
export type RouteDTO = ReturnType<typeof routeDTO>;
export type AttemptDTO = ReturnType<typeof attemptDTO>;
export type BatchDTO = ReturnType<typeof batchDTO>;

export function recipientDTO(r: BatchRecipient & { route?: PaymentRoute | null; attempts?: ExecutionAttempt[]; reconciliation?: ReconciliationRecord | null }, role: Role) {
  const full = can(role, "recipient.viewFullAddress");
  return {
    id: r.id,
    batchId: r.batchId,
    rowNumber: r.rowNumber,
    name: r.name,
    address: full ? r.address : redactAddress(r.address),
    addressInput: full ? r.addressInput : redactAddress(r.addressInput) ?? "",
    addressRedacted: !full,
    amount: r.amount,
    amountInput: r.amountInput,
    assetSymbol: r.assetSymbol,
    reference: r.reference,
    notBefore: r.notBefore?.toISOString() ?? null,
    valid: r.valid,
    errors: JSON.parse(r.errors) as Array<{ code: string; message: string; field?: string }>,
    warnings: JSON.parse(r.warnings) as Array<{ code: string; message: string; field?: string }>,
    status: r.status,
    attemptCount: r.attemptCount,
    lastError: r.lastError,
    scheduledFor: r.scheduledFor?.toISOString() ?? null,
    submittedAt: r.submittedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    route: r.route ? routeDTO(r.route) : null,
    attempts: r.attempts ? r.attempts.map(attemptDTO) : undefined,
    reconciliation: r.reconciliation
      ? { status: r.reconciliation.status, txHash: r.reconciliation.txHash, feeActual: r.reconciliation.feeActual, note: r.reconciliation.note, reconciledAt: r.reconciliation.reconciledAt?.toISOString() ?? null }
      : null,
  };
}

export function routeDTO(route: PaymentRoute) {
  return {
    id: route.id,
    provider: route.provider,
    providerRequestId: route.providerRequestId,
    routeKind: route.routeKind,
    originChainId: route.originChainId,
    destinationChainId: route.destinationChainId,
    steps: JSON.parse(route.steps) as Array<{ id: string; kind: string; description: string; chainId: number; to?: string; data?: string; value?: string; from?: string; gas?: string }>,
    fees: JSON.parse(route.fees) as Record<string, { symbol: string; amount: string; amountFormatted: string; amountUsd: string | null } | string | null>,
    feeTotalUsd: route.feeTotalUsd,
    amountIn: route.amountIn,
    timeEstimateSec: route.timeEstimateSec,
    quotedAt: route.quotedAt.toISOString(),
    expiresAt: route.expiresAt?.toISOString() ?? null,
    status: route.status,
    error: route.error,
  };
}

export function attemptDTO(a: ExecutionAttempt) {
  return {
    id: a.id,
    attemptNo: a.attemptNo,
    provider: a.provider,
    providerRequestId: a.providerRequestId,
    txHash: a.txHash,
    providerStatus: a.providerStatus,
    status: a.status,
    failReason: a.failReason,
    retryable: a.retryable,
    simulated: a.simulated,
    log: JSON.parse(a.log) as Array<{ at: string; event: string }>,
    startedAt: a.startedAt.toISOString(),
    finishedAt: a.finishedAt?.toISOString() ?? null,
  };
}

export function batchDTO(b: PaymentBatch & { _count?: { recipients: number } }) {
  return {
    id: b.id,
    name: b.name,
    reference: b.reference,
    kind: b.kind,
    status: b.status,
    mode: b.mode,
    assetSymbol: b.assetSymbol,
    assetDecimals: b.assetDecimals,
    originChainId: b.originChainId,
    destinationChainId: b.destinationChainId,
    csvFileName: b.csvFileName,
    csvHash: b.csvHash,
    recipientSetHash: b.recipientSetHash,
    totalAmount: b.totalAmount,
    validCount: b.validCount,
    invalidCount: b.invalidCount,
    recipientCount: b._count?.recipients ?? b.validCount + b.invalidCount,
    deadlineAt: b.deadlineAt?.toISOString() ?? null,
    jitterMaxSeconds: b.jitterMaxSeconds,
    approvedAt: b.approvedAt?.toISOString() ?? null,
    fundedAt: b.fundedAt?.toISOString() ?? null,
    executionStartedAt: b.executionStartedAt?.toISOString() ?? null,
    completedAt: b.completedAt?.toISOString() ?? null,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  };
}
