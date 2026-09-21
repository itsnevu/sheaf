"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client";
import type { BatchDTO, RecipientDTO } from "@/lib/serialize";
import type { FeedEvent } from "./ActivityFeed";

export interface BatchDetail {
  batch: BatchDTO;
  summary: {
    recipients: number;
    valid: number;
    invalid: number;
    routed: number;
    routeUnavailable: number;
    completed: number;
    failed: number;
    retryEligible: number;
    inFlight: number;
    feeEstimateUsd: string | null;
    fundingRequired: string | null;
    feesComplete: boolean;
    directTransferRoutes: number;
  };
  recipients: RecipientDTO[];
  approvals: Array<{ id: string; approverEmail: string; status: string; note: string | null; totalAmount: string; recipientSetHash: string; createdAt: string; invalidatedAt: string | null; invalidatedReason: string | null }>;
  funding: Array<{ id: string; chainId: number; fromAddress: string; txHash: string | null; amount: string; assetSymbol: string; status: string; simulated: boolean; note: string | null; createdAt: string }>;
  events: FeedEvent[];
  canEdit: boolean;
}

const LIVE = ["EXECUTING", "FUNDED", "VALIDATED", "ROUTES_PREPARED"];

export function useBatch(id: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["batch", id],
    queryFn: () => api<BatchDetail>(`/api/batches/${id}`),
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d) return 4000;
      const routing = d.recipients.some((r) => r.valid && !r.route) && d.batch.status === "VALIDATED";
      return LIVE.includes(d.batch.status) || routing ? 2500 : 15000;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["batch", id] });
  return { ...q, refresh };
}
