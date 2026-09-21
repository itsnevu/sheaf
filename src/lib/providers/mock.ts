import { createHash } from "crypto";
import type {
  PaymentProvider,
  QuoteFailure,
  QuoteInput,
  QuoteResult,
  StatusResult,
  SubmitInput,
  SubmitResult,
} from "./types";

/**
 * Deterministic simulation for the demo environment. Nothing here touches a network.
 *
 * Scenario rules (documented in docs/development.md so testers can trigger them):
 *  - recipient address ending in "00"  → permanent failure (BLOCKED_WALLET analogue)
 *  - recipient address ending in "ff"  → first attempt fails transiently, retry succeeds
 *  - recipient address ending in "ee"  → route unavailable at quote time
 *  - amount == 0.13 units of any asset  → refund scenario
 *  - otherwise                          → success after a short simulated confirmation time
 *
 * All references are prefixed "sim-" and every record is flagged simulated=true.
 */

const CONFIRM_MS = 6_000;
const SUBMIT_MS = 2_500;

// In-memory state of simulated submissions. Restarting the server clears it, which is why
// the worker treats a missing reference as "unknown" and marks the attempt for review.
type Sim = { at: number; recipient: string; amount: string; attemptNo: number };
const submissions = new Map<string, Sim>();

function hex(seed: string, len: number): string {
  return createHash("sha256").update(seed).digest("hex").slice(0, len);
}

function scenario(recipient: string, amount: string): "permanent" | "transient" | "unavailable" | "refund" | "ok" {
  const a = recipient.toLowerCase();
  if (a.endsWith("00")) return "permanent";
  if (a.endsWith("ff")) return "transient";
  if (a.endsWith("ee")) return "unavailable";
  if (amount === "130000" || amount === "130000000000000000") return "refund";
  return "ok";
}

export class MockProvider implements PaymentProvider {
  readonly name = "mock" as const;
  readonly simulated = true;

  describe() {
    return { label: "Simulated routing (demo)", detail: "Deterministic mock provider. No network calls, no funds." };
  }

  async quote(input: QuoteInput): Promise<QuoteResult | QuoteFailure> {
    await sleep(120 + (parseInt(hex(input.recipient, 2), 16) % 200));
    const sc = scenario(input.recipient, input.amount);
    if (sc === "unavailable") {
      return { ok: false, code: "NO_QUOTES", message: "No liquidity provider returned a route for this recipient (simulated)", retryable: true };
    }
    const cross = input.originChainId !== input.destinationChainId;
    const requestId = "sim-q-" + hex(input.correlationKey + input.amount, 24);
    const gasUnits = 45_000_000_000_000n + BigInt(parseInt(hex(input.recipient + "g", 4), 16)) * 1_000_000n; // ~0.000045 ETH
    const gasUsd = (Number(gasUnits) / 1e18 * 2600).toFixed(6);
    const relayerUnits = cross ? 40_000n + BigInt(parseInt(hex(input.recipient + "r", 3), 16)) : 0n; // ~0.04 USDC
    const relayerUsd = (Number(relayerUnits) / 1e6).toFixed(6);
    const amountIn = (BigInt(input.amount) + relayerUnits).toString();
    const steps = cross
      ? [
          { id: "approve", kind: "transaction" as const, description: "Approve the routing contract to move the asset", chainId: input.originChainId, from: input.user, to: input.originCurrency, data: "0x095ea7b3", value: "0" },
          { id: "deposit", kind: "transaction" as const, description: "Deposit into the route", chainId: input.originChainId, from: input.user, to: "0x" + hex("sim-depository", 40), data: "0x", value: "0" },
        ]
      : [{ id: "send", kind: "transaction" as const, description: "Send funds to the recipient", chainId: input.originChainId, from: input.user, to: input.originCurrency, data: "0xa9059cbb", value: "0" }];
    return {
      ok: true,
      providerRequestId: requestId,
      routeKind: cross ? "cross_chain" : "direct_transfer",
      steps,
      fees: {
        gas: { symbol: "ETH", amount: gasUnits.toString(), amountFormatted: (Number(gasUnits) / 1e18).toFixed(8), amountUsd: gasUsd },
        relayer: { symbol: "USDC", amount: relayerUnits.toString(), amountFormatted: (Number(relayerUnits) / 1e6).toFixed(6), amountUsd: relayerUsd },
        relayerGas: null,
        relayerService: null,
        app: null,
        totalUsd: (Number(gasUsd) + Number(relayerUsd)).toFixed(6),
      },
      amountIn,
      timeEstimateSec: cross ? 12 : 4,
      expiresAt: new Date(Date.now() + 15 * 60_000),
      raw: { simulated: true, scenario: sc },
    };
  }

  async submit(input: SubmitInput): Promise<SubmitResult> {
    await sleep(80);
    const attemptNo = Number(input.idempotencyKey.split(":").pop() ?? "1");
    const ref = "sim-tx-" + hex(input.idempotencyKey, 32);
    submissions.set(ref, { at: Date.now(), recipient: input.recipient, amount: input.amount, attemptNo });
    return { providerRequestId: ref, txHash: "0x" + hex("txhash:" + input.idempotencyKey, 64), simulated: true };
  }

  async status(ref: string): Promise<StatusResult> {
    await sleep(40);
    const sim = submissions.get(ref);
    const base = { inTxHashes: [] as string[], txHashes: [] as string[], failReason: null as string | null, retryable: false, details: null as string | null, updatedAt: new Date(), raw: { simulated: true } };
    if (!sim) {
      return { ...base, status: "unknown", details: "Simulated reference not found in this server process (restart?)" };
    }
    const age = Date.now() - sim.at;
    const sc = scenario(sim.recipient, sim.amount);
    const txHash = "0x" + hex("fill:" + ref, 64);
    if (age < SUBMIT_MS) return { ...base, status: "pending" };
    if (age < CONFIRM_MS) return { ...base, status: "submitted", txHashes: [txHash] };
    switch (sc) {
      case "permanent":
        return { ...base, status: "failure", failReason: "BLOCKED_WALLET", retryable: false, details: "Recipient flagged by screening at fill time (simulated)" };
      case "transient":
        if (sim.attemptNo <= 1) {
          return { ...base, status: "failure", failReason: "SOLVER_CAPACITY_EXCEEDED", retryable: true, details: "Solver capacity exhausted; safe to retry (simulated)" };
        }
        return { ...base, status: "success", txHashes: [txHash] };
      case "refund":
        return { ...base, status: "refund", inTxHashes: ["0x" + hex("refund:" + ref, 64)], failReason: "DEPOSITED_AMOUNT_TOO_LOW_TO_FILL", details: "Deposit refunded to the treasury (simulated)" };
      default:
        return { ...base, status: "success", txHashes: [txHash] };
    }
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
