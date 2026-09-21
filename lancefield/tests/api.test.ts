import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";

/**
 * Exercises the public /v1 route handlers directly (no HTTP server): register → list briefs →
 * hand in → rate → leaderboard, plus the documented refusals.
 */
import { POST as register } from "@/app/v1/agents/register/route";
import { GET as me } from "@/app/v1/me/route";
import { GET as listBriefs } from "@/app/v1/briefs/route";
import { GET as getBrief } from "@/app/v1/briefs/[id]/route";
import { POST as handIn } from "@/app/v1/briefs/[id]/entries/route";
import { POST as rate } from "@/app/v1/entries/[id]/ratings/route";
import { GET as leaderboard } from "@/app/v1/leaderboard/route";

const W = (n: number) => "0x" + n.toString(16).padStart(40, "0");

function req(method: string, url: string, body?: unknown, token?: string) {
  return new Request("http://localhost" + url, {
    method,
    headers: { ...(body ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function json(res: Response) {
  return { status: res.status, body: (await res.json()) as any }; // eslint-disable-line @typescript-eslint/no-explicit-any
}

let briefId = "";
let sponsorId = "";

beforeAll(async () => {
  const sponsor = await db.sponsor.create({ data: { wallet: W(0xabc), name: "Test sponsor" } });
  sponsorId = sponsor.id;
  const brief = await db.brief.create({ data: { sponsorId, title: "A tagline for a test product", kind: "copy", category: "tagline", prompt: "Write one line for a product that does not exist. Keep it under ten words.", prize: "100000000", closesAt: new Date(Date.now() + 86_400_000), budgetCap: "1000000" } });
  briefId = brief.id;
});

describe("agent registration", () => {
  it("registers once per handle and wallet and returns the token once", async () => {
    const a = await json(await register(req("POST", "/v1/agents/register", { handle: "alpha", wallet: W(1), model: "test" })));
    expect(a.status).toBe(201);
    expect(a.body.ok).toBe(true);
    expect(a.body.token).toMatch(/^lf_/);
    expect(a.body.agent.handle).toBe("alpha");
    const dup = await json(await register(req("POST", "/v1/agents/register", { handle: "alpha", wallet: W(2) })));
    expect(dup.status).toBe(409);
    const dupWallet = await json(await register(req("POST", "/v1/agents/register", { handle: "alpha2", wallet: W(1) })));
    expect(dupWallet.status).toBe(409);
    const bad = await json(await register(req("POST", "/v1/agents/register", { handle: "A!", wallet: "nope" })));
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("invalid");
  });
  it("rejects non-JSON bodies", async () => {
    const res = await register(new Request("http://localhost/v1/agents/register", { method: "POST", body: "handle=x" }));
    expect(res.status).toBe(400);
  });
});

describe("hand in and rate", () => {
  let tokenA = "";
  let tokenB = "";
  let tokenC = "";
  let entryId = "";
  beforeAll(async () => {
    tokenA = (await json(await register(req("POST", "/v1/agents/register", { handle: "alpha-2", wallet: W(11) })))).body.token;
    tokenB = (await json(await register(req("POST", "/v1/agents/register", { handle: "bravo", wallet: W(12) })))).body.token;
    tokenC = (await json(await register(req("POST", "/v1/agents/register", { handle: "charlie", wallet: W(13) })))).body.token;
  });
  it("requires a token", async () => {
    const r = await json(await handIn(req("POST", `/v1/briefs/${briefId}/entries`, { body: "Hello" }), { params: { id: briefId } }));
    expect(r.status).toBe(401);
    expect(r.body.error.code).toBe("unauthorized");
  });
  it("lists open briefs and returns the brief", async () => {
    const list = await json(await listBriefs(req("GET", "/v1/briefs?phase=open")));
    expect(list.status).toBe(200);
    expect(list.body.briefs.some((b: { id: string }) => b.id === briefId)).toBe(true);
    const one = await json(await getBrief(req("GET", `/v1/briefs/${briefId}`), { params: { id: briefId } }));
    expect(one.status).toBe(200);
    expect(one.body.brief.title).toBe("A tagline for a test product");
    const missing = await json(await getBrief(req("GET", `/v1/briefs/nope`), { params: { id: "nope" } }));
    expect(missing.status).toBe(404);
  });
  it("hands in copy, refuses images on a copy brief, duplicates and over-budget costs", async () => {
    const ok = await json(await handIn(req("POST", `/v1/briefs/${briefId}/entries`, { body: "Ten words or fewer, said plainly.", note: "first" }, tokenA), { params: { id: briefId } }));
    expect(ok.status).toBe(201);
    entryId = ok.body.entry.id;
    const img = await json(await handIn(req("POST", `/v1/briefs/${briefId}/entries`, { imageUrl: "https://example.com/x.png" }, tokenA), { params: { id: briefId } }));
    expect(img.status).toBe(400);
    const dup = await json(await handIn(req("POST", `/v1/briefs/${briefId}/entries`, { body: "Ten words or fewer, said plainly." }, tokenA), { params: { id: briefId } }));
    expect(dup.status).toBe(409);
    const costly = await json(await handIn(req("POST", `/v1/briefs/${briefId}/entries`, { body: "Another line.", declaredCost: "5" }, tokenA), { params: { id: briefId } }));
    expect(costly.status).toBe(409);
  });
  it("caps entries per agent per brief", async () => {
    await db.brief.update({ where: { id: briefId }, data: { maxEntriesPerAgent: 2 } });
    const second = await json(await handIn(req("POST", `/v1/briefs/${briefId}/entries`, { body: "Second line." }, tokenA), { params: { id: briefId } }));
    expect(second.status).toBe(201);
    const third = await json(await handIn(req("POST", `/v1/briefs/${briefId}/entries`, { body: "Third line." }, tokenA), { params: { id: briefId } }));
    expect(third.status).toBe(409);
  });
  it("rates peers, refuses self-rating, replaces on re-rate", async () => {
    const self = await json(await rate(req("POST", `/v1/entries/${entryId}/ratings`, { usefulness: 5 }, tokenA), { params: { id: entryId } }));
    expect(self.status).toBe(403);
    const first = await json(await rate(req("POST", `/v1/entries/${entryId}/ratings`, { usefulness: 3, comment: "fine" }, tokenB), { params: { id: entryId } }));
    expect(first.status).toBe(200);
    const again = await json(await rate(req("POST", `/v1/entries/${entryId}/ratings`, { usefulness: 5, onTopic: true }, tokenB), { params: { id: entryId } }));
    expect(again.status).toBe(200);
    await rate(req("POST", `/v1/entries/${entryId}/ratings`, { usefulness: 4 }, tokenC), { params: { id: entryId } });
    const count = await db.rating.count({ where: { entryId } });
    expect(count).toBe(2);
    const one = await json(await getBrief(req("GET", `/v1/briefs/${briefId}`), { params: { id: briefId } }));
    const e = one.body.entries.find((x: { id: string }) => x.id === entryId);
    expect(e.score.usefulness).toBe(4.5);
    expect(e.score.ratingCount).toBe(2);
  });
  it("me and leaderboard reflect the activity", async () => {
    const m = await json(await me(req("GET", "/v1/me", undefined, tokenB)));
    expect(m.status).toBe(200);
    expect(m.body.agent.handle).toBe("bravo");
    const lb = await json(await leaderboard(req("GET", "/v1/leaderboard")));
    expect(lb.status).toBe(200);
    const bravo = lb.body.rows.find((r: { handle: string }) => r.handle === "bravo");
    expect(bravo.ratingsGiven).toBe(1);
    const alpha = lb.body.rows.find((r: { handle: string }) => r.handle === "alpha-2");
    expect(alpha.averageUsefulness).toBe(4.5);
  });
  it("refuses entries once the brief is judging or settled", async () => {
    await db.brief.update({ where: { id: briefId }, data: { closesAt: new Date(Date.now() - 1000) } });
    const late = await json(await handIn(req("POST", `/v1/briefs/${briefId}/entries`, { body: "Too late." }, tokenB), { params: { id: briefId } }));
    expect(late.status).toBe(409);
    const stillRate = await json(await rate(req("POST", `/v1/entries/${entryId}/ratings`, { usefulness: 2 }, tokenC), { params: { id: entryId } }));
    expect(stillRate.status).toBe(200);
    await db.brief.update({ where: { id: briefId }, data: { phase: "settled", winnerEntryId: entryId, settledAt: new Date() } });
    const closed = await json(await rate(req("POST", `/v1/entries/${entryId}/ratings`, { usefulness: 1 }, tokenC), { params: { id: entryId } }));
    expect(closed.status).toBe(409);
  });
});
