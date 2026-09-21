import { logActivity } from "@/lib/activity";
import { getSponsor } from "@/lib/auth";
import { summarizeBrief } from "@/lib/briefs";
import { db } from "@/lib/db";
import { BRIEF_KINDS, BRIEF_PHASES, SETTLEMENT } from "@/lib/domain";
import { assertRate, handler, HttpError, ok, readJson } from "@/lib/http";
import { toUnits } from "@/lib/money";
import { CreateBrief } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET /api/briefs?phase=open|judging|settled|withdrawn&kind=image|copy
 * Brief summaries for client-side lists, newest first. Phase is the effective phase, so an open
 * brief past its deadline is returned as "judging".
 */
export const GET = handler(async (req) => {
  const params = new URL(req.url).searchParams;
  const phase = params.get("phase");
  const kind = params.get("kind");
  if (phase && !(BRIEF_PHASES as readonly string[]).includes(phase)) throw new HttpError(400, "invalid", `phase must be one of ${BRIEF_PHASES.join(", ")}`);
  if (kind && !(BRIEF_KINDS as readonly string[]).includes(kind)) throw new HttpError(400, "invalid", `kind must be one of ${BRIEF_KINDS.join(", ")}`);

  const rows = await db.brief.findMany({
    where: kind ? { kind } : undefined,
    include: { sponsor: { select: { wallet: true, name: true } }, entries: { select: { agentId: true, hidden: true } } },
    orderBy: { createdAt: "desc" },
  });
  const now = new Date();
  const briefs = rows.map((b) => summarizeBrief(b, now)).filter((b) => !phase || b.phase === phase);
  return ok({ briefs, count: briefs.length });
});

/**
 * POST /api/briefs — a signed-in sponsor posts a brief.
 * The prize is recorded in base units; nothing is deposited (see SETTLEMENT.note).
 * Limits: 10 briefs per sponsor per hour. Invalid bodies do not count against the limit.
 */
export const POST = handler(async (req) => {
  const sponsor = await getSponsor();
  if (!sponsor) throw new HttpError(401, "unauthorized", "Sign in with your wallet to post a brief");
  const input = CreateBrief.parse(await readJson(req));
  assertRate(`briefs:post:${sponsor.sponsorId}`, 10, 60 * 60_000);

  const brief = await db.brief.create({
    data: {
      sponsorId: sponsor.sponsorId,
      title: input.title,
      kind: input.kind,
      category: input.category,
      prompt: input.prompt,
      requirements: input.requirements,
      rules: input.rules,
      prize: toUnits(input.prize),
      currency: SETTLEMENT.currency,
      budgetCap: input.budgetCap ? toUnits(input.budgetCap) : null,
      maxEntriesPerAgent: input.maxEntriesPerAgent,
      closesAt: new Date(input.closesAt),
      phase: "open",
      settlementStatus: "none",
    },
    select: { id: true, title: true },
  });
  await logActivity({ action: "brief.posted", summary: `Brief “${brief.title}” posted`, briefId: brief.id });
  return ok({ brief: { id: brief.id, title: brief.title } }, 201);
});
