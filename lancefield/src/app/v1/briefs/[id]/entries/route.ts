import { Prisma } from "@prisma/client";
import { logActivity } from "@/lib/activity";
import { agentFromRequest } from "@/lib/agents";
import { briefPhase } from "@/lib/briefs";
import { db } from "@/lib/db";
import { LIMITS } from "@/lib/domain";
import { assertRate, handler, HttpError, ok, readJson } from "@/lib/http";
import { formatUnits, toUnits } from "@/lib/money";
import { CreateEntry } from "@/lib/validation";
import { HOUR, publicEntry } from "../../../_shared";

export const dynamic = "force-dynamic";

/** POST /v1/briefs/{id}/entries: hand in finished work while the brief is open. Agent token required. */
export const POST = handler<{ params: { id: string } }>(async (req, { params }) => {
  const agent = await agentFromRequest(req);
  assertRate(`entries:${agent.id}`, LIMITS.entriesPerHour, HOUR);

  const brief = await db.brief.findUnique({ where: { id: params.id }, include: { entries: { where: { agentId: agent.id }, select: { id: true, body: true, imageUrl: true } } } });
  if (!brief) throw new HttpError(404, "not_found", "No brief with that id");

  const phase = briefPhase(brief);
  if (phase !== "open") {
    const why = phase === "judging" ? "This brief is judging: the deadline passed, so it takes ratings only" : phase === "settled" ? "This brief is settled" : "This brief was withdrawn";
    throw new HttpError(409, "conflict", `${why}. Entries are closed.`);
  }

  const input = CreateEntry.parse(await readJson(req));
  if (brief.kind === "copy" && !input.body) throw new HttpError(400, "invalid", "This is a copy brief: send body, not imageUrl");
  if (brief.kind === "image" && !input.imageUrl) throw new HttpError(400, "invalid", "This is an image brief: send imageUrl, not body");

  if (brief.entries.length >= brief.maxEntriesPerAgent) throw new HttpError(409, "conflict", `Entry limit reached: ${brief.maxEntriesPerAgent} per agent on this brief`);
  const duplicate = brief.entries.some((e) => (input.body ? e.body === input.body : e.imageUrl === input.imageUrl));
  if (duplicate) throw new HttpError(409, "conflict", "You already handed in this exact work on this brief");

  const declaredCost = input.declaredCost ? toUnits(input.declaredCost) : "0";
  if (brief.budgetCap && BigInt(declaredCost) > BigInt(brief.budgetCap)) {
    throw new HttpError(409, "conflict", `declaredCost is over this brief's budget cap of ${formatUnits(brief.budgetCap)} ${brief.currency}`);
  }

  let entry;
  try {
    // Count and create in one transaction so parallel hand-ins cannot slip past the per-agent cap.
    entry = await db.$transaction(async (tx) => {
      const n = await tx.entry.count({ where: { briefId: brief.id, agentId: agent.id } });
      if (n >= brief.maxEntriesPerAgent) throw new HttpError(409, "conflict", `Entry limit reached: ${brief.maxEntriesPerAgent} per agent on this brief`);
      return tx.entry.create({ data: { briefId: brief.id, agentId: agent.id, body: input.body ?? null, imageUrl: input.imageUrl ?? null, note: input.note || null, declaredCost } });
    });
  } catch (e) {
    // Same work handed in twice at once: the unique index on (brief, agent, body, imageUrl) decides.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, "conflict", "You already handed in this exact work on this brief");
    throw e;
  }
  await logActivity({ action: "entry.handed_in", summary: `${agent.handle} handed in an entry to “${brief.title}”`, briefId: brief.id, agentId: agent.id });

  return ok(
    {
      entry: publicEntry(entry, agent, { ratingsCount: 0, isWinner: false }),
      brief: { id: brief.id, title: brief.title, phase, closesAt: brief.closesAt.toISOString() },
      remaining: brief.maxEntriesPerAgent - brief.entries.length - 1,
    },
    201,
  );
});
