import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientIp, rateLimit, resetRateLimits } from "@/lib/ratelimit";

beforeEach(() => resetRateLimits());
afterEach(() => {
  delete process.env.SHEAF_RATE_LIMIT;
});

describe("rateLimit", () => {
  it("allows up to the limit then blocks with a retry hint", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", { limit: 3, windowMs: 60_000 }, t0 + i).ok).toBe(true);
    const blocked = rateLimit("k", { limit: 3, windowMs: 60_000 }, t0 + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });
  it("slides the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) rateLimit("k", { limit: 3, windowMs: 1_000 }, t0);
    expect(rateLimit("k", { limit: 3, windowMs: 1_000 }, t0 + 500).ok).toBe(false);
    expect(rateLimit("k", { limit: 3, windowMs: 1_000 }, t0 + 1_001).ok).toBe(true);
  });
  it("keys are independent", () => {
    rateLimit("a", { limit: 1, windowMs: 1_000 }, 0);
    expect(rateLimit("a", { limit: 1, windowMs: 1_000 }, 1).ok).toBe(false);
    expect(rateLimit("b", { limit: 1, windowMs: 1_000 }, 1).ok).toBe(true);
  });
  it("can be switched off for automated tests", () => {
    process.env.SHEAF_RATE_LIMIT = "off";
    for (let i = 0; i < 50; i++) expect(rateLimit("k", { limit: 1, windowMs: 1_000 }, i).ok).toBe(true);
  });
});

describe("clientIp", () => {
  it("prefers the first forwarded hop", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" } }))).toBe("203.0.113.9");
    expect(clientIp(new Request("http://x", { headers: { "x-real-ip": "198.51.100.2" } }))).toBe("198.51.100.2");
    expect(clientIp(new Request("http://x"))).toBe("local");
  });
});
