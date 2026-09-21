/**
 * Provider-neutral payment routing interface. Business logic depends only on these types.
 * Implementations: mock.ts (demo) and relay.ts (real, Relay HTTP API).
 */

export interface QuoteInput {
  /** Address that funds and signs the route (treasury). */
  user: string;
  recipient: string;
  originChainId: number;
  destinationChainId: number;
  originCurrency: string; // token address on origin
  destinationCurrency: string; // token address on destination
  /** Base units the recipient must receive. */
  amount: string;
  /** Where refunds go on failure (origin chain). */
  refundTo: string;
  /** Local correlation key (batchId:recipientId); not sent to the provider. */
  correlationKey: string;
}

export interface RouteStep {
  id: string; // approve | deposit | send | authorize | swap
  kind: "transaction" | "signature";
  description: string;
  chainId: number;
  from?: string;
  to?: string;
  data?: string;
  value?: string;
  gas?: string;
}

export interface FeeItem {
  symbol: string;
  amount: string; // base units
  amountFormatted: string;
  amountUsd: string | null;
}

export interface QuoteResult {
  ok: true;
  providerRequestId: string;
  routeKind: "direct_transfer" | "cross_chain" | "swap";
  steps: RouteStep[];
  fees: {
    gas: FeeItem | null;
    relayer: FeeItem | null;
    relayerGas: FeeItem | null;
    relayerService: FeeItem | null;
    app: FeeItem | null;
    totalUsd: string | null;
  };
  /** Base units of origin currency the treasury sends for this route. */
  amountIn: string;
  timeEstimateSec: number | null;
  expiresAt: Date | null;
  raw?: unknown;
}

export interface QuoteFailure {
  ok: false;
  code: string;
  message: string;
  retryable: boolean;
}

export type ProviderStatus =
  | "waiting" // no deposit seen yet
  | "pending" // deposit seen, fill pending
  | "submitted" // destination tx submitted
  | "success"
  | "failure"
  | "refund"
  | "delayed"
  | "unknown"; // provider unreachable / ambiguous — never treat as failed

export interface StatusResult {
  status: ProviderStatus;
  inTxHashes: string[];
  txHashes: string[];
  failReason: string | null;
  retryable: boolean;
  details: string | null;
  updatedAt: Date | null;
  raw?: unknown;
}

export interface SubmitInput {
  providerRequestId: string;
  idempotencyKey: string;
  recipient: string;
  amount: string;
}

export interface SubmitResult {
  /** Reference under which status can be polled. In demo it is a simulated reference. */
  providerRequestId: string;
  txHash: string | null;
  simulated: boolean;
}

export interface PaymentProvider {
  readonly name: "mock" | "relay";
  readonly simulated: boolean;
  quote(input: QuoteInput): Promise<QuoteResult | QuoteFailure>;
  /**
   * Demo only: the provider "submits" for us. In real mode the browser wallet signs the
   * step and the server records the tx hash; submit() throws.
   */
  submit(input: SubmitInput): Promise<SubmitResult>;
  status(providerRequestId: string): Promise<StatusResult>;
  describe(): { label: string; detail: string };
}
