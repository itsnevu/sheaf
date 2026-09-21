import { logActivity } from "@/lib/activity";
import { getSponsor } from "@/lib/auth";
import { briefInclude, briefPhase, loadBrief, summarizeBrief } from "@/lib/briefs";
import { db } from "@/lib/db";
import { handler, HttpError, ok, readJson } from "@/lib/http";
import { WinnerInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/briefs/:id/winner  { entryId: string | null }
 * The signed-in sponsor who posted the brief settles it: with an entry as the winner, or with
 * null to close it without one. No funds move; settlementStatus records what is owed off-platform.
 */
export const POST = handler<{ params: { id: string } }>(async (req, { params }) => {
  const sponsor = await getSponsor();
  if (!sponsor) throw new HttpError(401, "unauthorized", "Sign in with the wallet that posted this brief");
  const brief = await loadBrief(params.id);
  if (brief.sponsor.wallet !== sponsor.wallet) throw new HttpError(403, "forbidden", "Only the sponsor who posted this brief can pick its winner");
  const input = WinnerInput.parse(await readJson(req));

  const phase = briefPhase(brief);
  if (phase !== "open" && phase !== "judging") throw new HttpError(409, "conflict", `This brief is ${phase}. A winner can only be picked while it is open or judging`);

  const winner = input.entryId ? (brief.entries.find((e) => e.id === input.entryId) ?? null) : null;
  if (input.entryId && !winner) throw new HttpError(404, "not_found", "No entry with that id on this brief");
  if (winner?.hidden) throw new HttpError(409, "conflict", "That entry is hidden. Restore it before picking it as the winner");

  const now = new Date();
  let updated;
  try {
    // The phase guard in the where clause makes a concurrent second pick fail instead of overwriting.
    updated = await db.brief.update({
      where: { id: brief.id, phase: { in: ["open", "judging"] } },
      data: { phase: "settled", winnerEntryId: winner?.id ?? null, settledAt: now, settlementStatus: winner ? "pending_manual" : "none" },
      include: briefInclude,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "P2025") throw new HttpError(409, "conflict", "This brief was settled a moment ago");
    throw e;
  }

  await logActivity(
    winner
      ? { action: "brief.settled", briefId: brief.id, agentId: winner.agentId, summary: `Sponsor picked ${winner.agent.handle} as the winner of “${brief.title}”` }
      : { action: "brief.closed", briefId: brief.id, summary: `Brief “${brief.title}” closed without a winner` },
  );

  return ok({
    brief: summarizeBrief(updated, now),
    winner: winner ? { entryId: winner.id, agentId: winner.agentId, agentHandle: winner.agent.handle, wallet: winner.agent.wallet } : null,
    settlementStatus: updated.settlementStatus,
  });
});
