import { describe, expect, it } from "vitest";
import { CreateBrief, CreateEntry, CreateRating, EarlyAccessInput, RegisterAgent } from "@/lib/validation";
import { effectivePhase } from "@/lib/domain";

const future = new Date(Date.now() + 3 * 86_400_000).toISOString();

describe("RegisterAgent", () => {
  it("accepts a valid handle and wallet", () => {
    expect(RegisterAgent.safeParse({ handle: "quill-9", wallet: "0x1111111111111111111111111111111111111111" }).success).toBe(true);
  });
  it("rejects bad handles and addresses", () => {
    expect(RegisterAgent.safeParse({ handle: "Q!", wallet: "0x1111111111111111111111111111111111111111" }).success).toBe(false);
    expect(RegisterAgent.safeParse({ handle: "fine", wallet: "not-an-address" }).success).toBe(false);
  });
});

describe("CreateBrief", () => {
  const base = { title: "A launch poster", kind: "image", category: "poster", prompt: "Make a poster for a coffee subscription with one strong visual and the brand name.", prize: "250", closesAt: future };
  it("accepts a complete brief", () => {
    const r = CreateBrief.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.maxEntriesPerAgent).toBe(5);
  });
  it("rejects a category from the other kind", () => {
    const r = CreateBrief.safeParse({ ...base, category: "tagline" });
    expect(r.success).toBe(false);
  });
  it("rejects deadlines in the past or too far out", () => {
    expect(CreateBrief.safeParse({ ...base, closesAt: new Date(Date.now() - 1000).toISOString() }).success).toBe(false);
    expect(CreateBrief.safeParse({ ...base, closesAt: new Date(Date.now() + 200 * 86_400_000).toISOString() }).success).toBe(false);
  });
  it("rejects malformed prizes", () => {
    expect(CreateBrief.safeParse({ ...base, prize: "12.3456789" }).success).toBe(false);
    expect(CreateBrief.safeParse({ ...base, prize: "-5" }).success).toBe(false);
  });
});

describe("CreateEntry / CreateRating / EarlyAccess", () => {
  it("requires exactly one of body or imageUrl", () => {
    expect(CreateEntry.safeParse({ body: "Hello" }).success).toBe(true);
    expect(CreateEntry.safeParse({ imageUrl: "https://example.com/a.png" }).success).toBe(true);
    expect(CreateEntry.safeParse({ body: "x", imageUrl: "https://example.com/a.png" }).success).toBe(false);
    expect(CreateEntry.safeParse({ imageUrl: "http://example.com/a.png" }).success).toBe(false);
    expect(CreateEntry.safeParse({}).success).toBe(false);
  });
  it("bounds ratings", () => {
    expect(CreateRating.safeParse({ usefulness: 5 }).success).toBe(true);
    expect(CreateRating.safeParse({ usefulness: 6 }).success).toBe(false);
    expect(CreateRating.safeParse({ usefulness: 2.5 }).success).toBe(false);
  });
  it("normalises early-access emails", () => {
    const r = EarlyAccessInput.safeParse({ email: "  Someone@Example.COM ", role: "agent" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("someone@example.com");
  });
});

describe("effectivePhase", () => {
  it("turns an open brief past its deadline into judging", () => {
    const past = new Date(Date.now() - 1000);
    expect(effectivePhase("open", past)).toBe("judging");
    expect(effectivePhase("open", new Date(Date.now() + 1000))).toBe("open");
    expect(effectivePhase("settled", past)).toBe("settled");
  });
});
