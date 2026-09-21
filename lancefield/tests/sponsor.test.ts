import { beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

/** Sponsor-side site API with the wallet session mocked: post a brief, hide an entry, pick a winner, early access. */

const W = (n: number) => "0x" + n.toString(16).padStart(40, "0");
const session = { sponsorId: "", wallet: W(0xbeef), name: "Owner" };
vi.mock("@/lib/auth", () => ({ getSponsor: async () => (session.sponsorId ? session : null) }));

import { POST as postBrief, GET as listBriefs } from "@/app/api/briefs/route";
import { POST as pickWinner } from "@/app/api/briefs/[id]/winner/route";
import { POST as hideEntry } from "@/app/api/briefs/[id]/hide/route";
import { POST as earlyAccess } from "@/app/api/early-access/route";

function req(method: string, url: string, body?: unknown) {
  return new Request("http://localhost" + url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
}
const json = async (res: Response) => ({ status: res.status, body: (await res.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any

let briefId = "";
let entryA = "";
let entryB = "";

describe("posting a brief", () => {
  it("requires a session", async () => {
    session.sponsorId = "";
    const r = await json(await postBrief(req("POST", "/api/briefs", {})));
    expect(r.status).toBe(401);
  });
  it("creates a brief for the signed-in sponsor with base-unit money", async () => {
    const sponsor = await db.sponsor.create({ data: { wallet: W(0xbeef), name: "Owner" } });
    session.sponsorId = sponsor.id;
    const closesAt = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const r = await json(await postBrief(req("POST", "/api/briefs", { title: "A poster for a test launch", kind: "image", category: "poster", prompt: "Make one strong poster for a product launch. Warm printed feel and generous whitespace.", prize: "250", budgetCap: "5", closesAt, maxEntriesPerAgent: 3 })));
    expect(r.status).toBe(201);
    briefId = r.body.brief.id;
    const stored = await db.brief.findUniqueOrThrow({ where: { id: briefId } });
    expect(stored.prize).toBe("250000000");
    expect(stored.budgetCap).toBe("5000000");
    expect(stored.phase).toBe("open");
    expect(stored.settlementStatus).toBe("none");
    const list = await json(await listBriefs(req("GET", "/api/briefs?phase=open&kind=image")));
    expect(list.body.briefs.some((b: { id: string }) => b.id === briefId)).toBe(true);
    const bad = await json(await listBriefs(req("GET", "/api/briefs?phase=nope")));
    expect(bad.status).toBe(400);
  });
  it("rejects an invalid body with field messages", async () => {
    const r = await json(await postBrief(req("POST", "/api/briefs", { title: "x", kind: "copy", category: "poster", prompt: "short", prize: "abc", closesAt: "yesterday" })));
    expect(r.status).toBe(400);
    expect(r.body.error.message).toMatch(/title|prompt|prize|closesAt/);
  });
});

describe("hiding entries and picking the winner", () => {
  beforeAll(async () => {
    const a = await db.agent.create({ data: { handle: "sp-a", wallet: W(0x51), tokenHash: "ha" } });
    const b = await db.agent.create({ data: { handle: "sp-b", wallet: W(0x52), tokenHash: "hb" } });
    entryA = (await db.entry.create({ data: { briefId, agentId: a.id, imageUrl: "https://example.com/a.png" } })).id;
    entryB = (await db.entry.create({ data: { briefId, agentId: b.id, imageUrl: "https://example.com/b.png" } })).id;
  });
  it("refuses other wallets", async () => {
    const other = await db.sponsor.create({ data: { wallet: W(0xcafe) } });
    const saved = { ...session };
    Object.assign(session, { sponsorId: other.id, wallet: W(0xcafe) });
    const r = await json(await hideEntry(req("POST", `/api/briefs/${briefId}/hide`, { entryId: entryA, hidden: true }), { params: { id: briefId } }));
    expect(r.status).toBe(403);
    Object.assign(session, saved);
  });
  it("hides and restores an entry", async () => {
    const hide = await json(await hideEntry(req("POST", `/api/briefs/${briefId}/hide`, { entryId: entryA, hidden: true }), { params: { id: briefId } }));
    expect(hide.status).toBe(200);
    expect((await db.entry.findUniqueOrThrow({ where: { id: entryA } })).hidden).toBe(true);
    const cannotWin = await json(await pickWinner(req("POST", `/api/briefs/${briefId}/winner`, { entryId: entryA }), { params: { id: briefId } }));
    expect(cannotWin.status).toBe(409);
    const restore = await json(await hideEntry(req("POST", `/api/briefs/${briefId}/hide`, { entryId: entryA, hidden: false }), { params: { id: briefId } }));
    expect(restore.status).toBe(200);
    expect(restore.body.changed).toBe(true);
  });
  it("picks a winner once and records pending settlement", async () => {
    const missing = await json(await pickWinner(req("POST", `/api/briefs/${briefId}/winner`, { entryId: "nope" }), { params: { id: briefId } }));
    expect(missing.status).toBe(404);
    const pick = await json(await pickWinner(req("POST", `/api/briefs/${briefId}/winner`, { entryId: entryB }), { params: { id: briefId } }));
    expect(pick.status).toBe(200);
    expect(pick.body.settlementStatus).toBe("pending_manual");
    expect(pick.body.winner.agentHandle).toBe("sp-b");
    const stored = await db.brief.findUniqueOrThrow({ where: { id: briefId } });
    expect(stored.phase).toBe("settled");
    expect(stored.winnerEntryId).toBe(entryB);
    const again = await json(await pickWinner(req("POST", `/api/briefs/${briefId}/winner`, { entryId: entryA }), { params: { id: briefId } }));
    expect(again.status).toBe(409);
    const hideWinner = await json(await hideEntry(req("POST", `/api/briefs/${briefId}/hide`, { entryId: entryB, hidden: true }), { params: { id: briefId } }));
    expect(hideWinner.status).toBe(409);
    expect(await db.activityEvent.count({ where: { briefId, action: "brief.settled" } })).toBe(1);
  });
  it("can close a brief without a winner", async () => {
    const closesAt = new Date(Date.now() + 2 * 86_400_000).toISOString();
    const r = await json(await postBrief(req("POST", "/api/briefs", { title: "A tagline nobody will win", kind: "copy", category: "tagline", prompt: "Write one line for nothing in particular, plainly and briefly.", prize: "10", closesAt })));
    const id = r.body.brief.id;
    const close = await json(await pickWinner(req("POST", `/api/briefs/${id}/winner`, { entryId: null }), { params: { id } }));
    expect(close.status).toBe(200);
    expect(close.body.settlementStatus).toBe("none");
    expect((await db.brief.findUniqueOrThrow({ where: { id } })).phase).toBe("settled");
  });
});

describe("early access", () => {
  it("stores one row per email", async () => {
    const first = await json(await earlyAccess(req("POST", "/api/early-access", { email: "Someone@Example.com", role: "agent", note: "hi" })));
    expect(first.status).toBe(201);
    const dup = await json(await earlyAccess(req("POST", "/api/early-access", { email: "someone@example.com", role: "sponsor" })));
    expect(dup.status).toBe(409);
    const bad = await json(await earlyAccess(req("POST", "/api/early-access", { email: "nope", role: "agent" })));
    expect(bad.status).toBe(400);
  });
});
