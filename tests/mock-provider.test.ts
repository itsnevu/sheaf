import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockProvider } from "@/lib/providers/mock";

const TREASURY = "0x00000000000000000000000000000000000000a1";
const USDC = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
const OK = "0x1111111111111111111111111111111111111111";
const BLOCKED = "0x1111111111111111111111111111111111111100";
const TRANSIENT = "0x11111111111111111111111111111111111111ff";
const NO_ROUTE = "0x11111111111111111111111111111111111111ee";

function quoteInput(recipient: string, amount = "1000000", dest = 8453) {
  return { user: TREASURY, recipient, originChainId: 8453, destinationChainId: dest, originCurrency: USDC, destinationCurrency: USDC, amount, refundTo: TREASURY, correlationKey: `b:${recipient}` };
}

let p: MockProvider;

beforeEach(() => {
  vi.useFakeTimers();
  p = new MockProvider();
});
afterEach(() => vi.useRealTimers());

/** Await a provider call while letting its simulated delay elapse. */
async function run<T>(promise: Promise<T>): Promise<T> {
  await vi.advanceTimersByTimeAsync(1000);
  return promise;
}

describe("MockProvider quotes", () => {
  it("is simulated and deterministic", async () => {
    expect(p.simulated).toBe(true);
    const a = await run(p.quote(quoteInput(OK)));
    const b = await run(p.quote(quoteInput(OK)));
    if (!a.ok || !b.ok) throw new Error("expected ok");
    const { expiresAt: _a, ...aRest } = a;
    const { expiresAt: _b, ...bRest } = b;
    expect(aRest).toEqual(bRest);
    expect(a.providerRequestId.startsWith("sim-q-")).toBe(true);
    expect(a.routeKind).toBe("direct_transfer");
    expect(a.steps.map((s) => s.id)).toEqual(["send"]);
    expect(a.amountIn).toBe("1000000"); // no relayer fee on a direct transfer
  });
  it("adds a relayer fee and two steps for cross-chain routes", async () => {
    const q = await run(p.quote(quoteInput(OK, "1000000", 42161)));
    if (!q.ok) throw new Error("expected ok");
    expect(q.routeKind).toBe("cross_chain");
    expect(q.steps.map((s) => s.id)).toEqual(["approve", "deposit"]);
    expect(BigInt(q.amountIn)).toBeGreaterThan(1000000n);
    expect(Number(q.fees.totalUsd)).toBeGreaterThan(0);
  });
  it("reports no route for the unavailable scenario", async () => {
    const q = await run(p.quote(quoteInput(NO_ROUTE)));
    expect(q.ok).toBe(false);
    if (q.ok) return;
    expect(q.code).toBe("NO_QUOTES");
    expect(q.retryable).toBe(true);
  });
});

describe("MockProvider settlement", () => {
  async function submitAndSettle(recipient: string, attemptNo = 1, amount = "1000000") {
    const key = `exec:b:r:${attemptNo}`;
    const sub = await run(p.submit({ providerRequestId: "sim-q-x", idempotencyKey: key, recipient, amount }));
    expect(sub.simulated).toBe(true);
    expect(sub.providerRequestId.startsWith("sim-tx-")).toBe(true);
    const early = await run(p.status(sub.providerRequestId));
    expect(early.status).toBe("pending");
    await vi.advanceTimersByTimeAsync(3000);
    const mid = await run(p.status(sub.providerRequestId));
    expect(mid.status).toBe("submitted");
    expect(mid.txHashes).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(6000);
    return run(p.status(sub.providerRequestId));
  }

  it("confirms ordinary payments", async () => {
    const final = await submitAndSettle(OK);
    expect(final.status).toBe("success");
    expect(final.txHashes[0]).toMatch(/^0x[0-9a-f]{64}$/);
  });
  it("fails permanently for a blocked wallet", async () => {
    const final = await submitAndSettle(BLOCKED);
    expect(final.status).toBe("failure");
    expect(final.failReason).toBe("BLOCKED_WALLET");
    expect(final.retryable).toBe(false);
  });
  it("fails transiently on the first attempt and succeeds on retry", async () => {
    const first = await submitAndSettle(TRANSIENT, 1);
    expect(first.status).toBe("failure");
    expect(first.retryable).toBe(true);
    const second = await submitAndSettle(TRANSIENT, 2);
    expect(second.status).toBe("success");
  });
  it("refunds the 0.13 scenario", async () => {
    const final = await submitAndSettle(OK, 1, "130000");
    expect(final.status).toBe("refund");
    expect(final.inTxHashes).toHaveLength(1);
  });
  it("reports unknown for a reference it has never seen", async () => {
    const st = await run(p.status("sim-tx-does-not-exist"));
    expect(st.status).toBe("unknown");
    expect(st.retryable).toBe(false);
  });
});
