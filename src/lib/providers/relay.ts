import { relayConfig } from "@/lib/config";
import type {
  FeeItem,
  PaymentProvider,
  ProviderStatus,
  QuoteFailure,
  QuoteInput,
  QuoteResult,
  StatusResult,
  SubmitInput,
  SubmitResult,
} from "./types";

/**
 * Relay adapter. Uses only endpoints verified in docs/research/relay-integration-research.md:
 *   POST /quote/v2            → route + unsigned steps + fee estimate
 *   GET  /intents/status/v3   → execution status by requestId
 * No SDK; the treasury wallet signs the steps in the browser (see components/app/RealExecutionConsole).
 */

// failReason codes Relay documents as safe to retry.
const RETRYABLE = new Set([
  "SOLVER_CAPACITY_EXCEEDED",
  "SOLVER_BALANCE_TOO_LOW",
  "SPONSOR_BALANCE_TOO_LOW",
  "NO_QUOTES",
  "INSUFFICIENT_POOL_LIQUIDITY",
  "SLIPPAGE",
  "GENERATE_SWAP_FAILED",
  "REVERSE_SWAP_FAILED",
  "TRANSACTION_SUBMISSION_FAILED",
  "CONTRACT_PAUSED",
  "MINT_NOT_ACTIVE",
  "FLUID_DEX_ERROR",
]);

interface RelayFee {
  currency?: { symbol?: string; decimals?: number };
  amount?: string;
  amountFormatted?: string;
  amountUsd?: string;
}

function fee(f: RelayFee | undefined): FeeItem | null {
  if (!f || f.amount === undefined) return null;
  return {
    symbol: f.currency?.symbol ?? "?",
    amount: String(f.amount),
    amountFormatted: f.amountFormatted ?? String(f.amount),
    amountUsd: f.amountUsd ?? null,
  };
}

export class RelayProvider implements PaymentProvider {
  readonly name = "relay" as const;
  readonly simulated = false;
  private cfg = relayConfig();

  describe() {
    return { label: "Relay", detail: `${this.cfg.apiUrl} · ${this.cfg.apiKey ? "API key set" : "public rate limits"}` };
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json", accept: "application/json" };
    if (this.cfg.apiKey) h["x-api-key"] = this.cfg.apiKey;
    return h;
  }

  async quote(input: QuoteInput): Promise<QuoteResult | QuoteFailure> {
    const body: Record<string, unknown> = {
      user: input.user,
      recipient: input.recipient,
      originChainId: input.originChainId,
      destinationChainId: input.destinationChainId,
      originCurrency: input.originCurrency,
      destinationCurrency: input.destinationCurrency,
      amount: input.amount,
      tradeType: "EXACT_OUTPUT",
      refundTo: input.refundTo,
      ttl: 600,
    };
    if (this.cfg.referrer && this.cfg.apiKey) body.referrer = this.cfg.referrer;

    let res: Response;
    try {
      res = await fetch(`${this.cfg.apiUrl}/quote/v2`, { method: "POST", headers: this.headers(), body: JSON.stringify(body), cache: "no-store" });
    } catch (e) {
      return { ok: false, code: "NETWORK", message: `Could not reach Relay: ${(e as Error).message}`, retryable: true };
    }
    if (res.status === 429) return { ok: false, code: "RATE_LIMITED", message: "Relay rate limit reached (50 quotes/min without a key)", retryable: true };
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg = (json.message as string) || (json.error as string) || `HTTP ${res.status}`;
      const code = (json.errorCode as string) || `HTTP_${res.status}`;
      return { ok: false, code, message: msg, retryable: res.status >= 500 };
    }
    const steps = (json.steps as Array<Record<string, unknown>>) ?? [];
    const fees = (json.fees as Record<string, RelayFee>) ?? {};
    const details = (json.details as Record<string, unknown>) ?? {};
    const currencyIn = details.currencyIn as { amount?: string } | undefined;
    const stepIds = steps.map((s) => String(s.id));
    const routeKind: QuoteResult["routeKind"] =
      input.originChainId === input.destinationChainId && stepIds.length === 1 && stepIds[0] === "send"
        ? "direct_transfer"
        : input.originCurrency.toLowerCase() !== input.destinationCurrency.toLowerCase()
          ? "swap"
          : "cross_chain";
    const gas = fee(fees.gas);
    const relayer = fee(fees.relayer);
    const app = fee(fees.app);
    const totalUsd = [gas, relayer, app]
      .filter((f): f is FeeItem => !!f && !!f.amountUsd)
      .reduce((acc, f) => acc + Number(f.amountUsd), 0);
    return {
      ok: true,
      providerRequestId: String(json.requestId),
      routeKind,
      steps: steps.flatMap((s) => {
        const items = (s.items as Array<{ data?: Record<string, unknown> }>) ?? [];
        return items.map((it) => ({
          id: String(s.id),
          kind: (s.kind as "transaction" | "signature") ?? "transaction",
          description: String(s.description ?? s.action ?? s.id),
          chainId: Number(it.data?.chainId ?? input.originChainId),
          from: it.data?.from as string | undefined,
          to: it.data?.to as string | undefined,
          data: it.data?.data as string | undefined,
          value: it.data?.value !== undefined ? String(it.data.value) : "0",
          gas: it.data?.gas !== undefined ? String(it.data.gas) : undefined,
        }));
      }),
      fees: { gas, relayer, relayerGas: fee(fees.relayerGas), relayerService: fee(fees.relayerService), app, totalUsd: Number.isFinite(totalUsd) ? totalUsd.toFixed(6) : null },
      amountIn: currencyIn?.amount ? String(currencyIn.amount) : input.amount,
      timeEstimateSec: typeof details.timeEstimate === "number" ? details.timeEstimate : null,
      expiresAt: new Date(Date.now() + 600_000),
      raw: json,
    };
  }

  async submit(_input: SubmitInput): Promise<SubmitResult> {
    throw new Error("Relay routes are signed by the treasury wallet in the browser; the server never submits.");
  }

  async status(requestId: string): Promise<StatusResult> {
    let res: Response;
    try {
      res = await fetch(`${this.cfg.apiUrl}/intents/status/v3?requestId=${encodeURIComponent(requestId)}`, { headers: this.headers(), cache: "no-store" });
    } catch (e) {
      return unknown(`Could not reach Relay: ${(e as Error).message}`);
    }
    if (!res.ok) return unknown(`Relay status HTTP ${res.status}`);
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const s = String(j.status ?? "unknown");
    const map: Record<string, ProviderStatus> = {
      waiting: "waiting",
      depositing: "pending",
      pending: "pending",
      submitted: "submitted",
      success: "success",
      failure: "failure",
      refund: "refund",
      delayed: "delayed",
    };
    const failReason = (j.failReason as string | undefined) && j.failReason !== "N/A" ? String(j.failReason) : null;
    return {
      status: map[s] ?? "unknown",
      inTxHashes: (j.inTxHashes as string[]) ?? [],
      txHashes: (j.txHashes as string[]) ?? [],
      failReason,
      retryable: failReason ? RETRYABLE.has(failReason) : false,
      details: (j.details as string) ?? null,
      updatedAt: typeof j.updatedAt === "number" ? new Date(j.updatedAt) : null,
      raw: j,
    };
  }
}

function unknown(details: string): StatusResult {
  return { status: "unknown", inTxHashes: [], txHashes: [], failReason: null, retryable: false, details, updatedAt: null };
}
