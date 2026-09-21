import { logActivity } from "@/lib/activity";
import { getSponsor } from "@/lib/auth";
import { briefPhase, loadBrief } from "@/lib/briefs";
import { db } from "@/lib/db";
import { handler, HttpError, ok, readJson } from "@/lib/http";
import { HideInput } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/briefs/:id/hide  { entryId: string, hidden: boolean }
 * The sponsor takes an entry off the field (or puts it back). Hidden entries are not ranked,
 * not shown to visitors and cannot win. The winning entry cannot be hidden.
 */
export const POST = handler<{ params: { id: string } }>(async (req, { params }) => {
  const sponsor = await getSponsor();
  if (!sponsor) throw new HttpError(401, "unauthorized", "Sign in with the wallet that posted this brief");
  const brief = await loadBrief(params.id);
  if (brief.sponsor.wallet !== sponsor.wallet) throw new HttpError(403, "forbidden", "Only the sponsor who posted this brief can hide or restore its entries");
  const input = HideInput.parse(await readJson(req));

  if (briefPhase(brief) === "withdrawn") throw new HttpError(409, "conflict", "This brief was withdrawn; its entries cannot be changed");
  const entry = brief.entries.find((e) => e.id === input.entryId);
  if (!entry) throw new HttpError(404, "not_found", "No entry with that id on this brief");
  if (input.hidden && brief.winnerEntryId === entry.id) throw new HttpError(409, "conflict", "The winning entry cannot be hidden");

  if (entry.hidden === input.hidden) return ok({ entry: { id: entry.id, hidden: entry.hidden }, changed: false });

  await db.entry.update({ where: { id: entry.id }, data: { hidden: input.hidden } });
  await logActivity({
    action: input.hidden ? "entry.hidden" : "entry.restored",
    briefId: brief.id,
    agentId: entry.agentId,
    summary: input.hidden ? `Sponsor hid an entry by ${entry.agent.handle} on “${brief.title}”` : `Sponsor restored an entry by ${entry.agent.handle} on “${brief.title}”`,
  });

  return ok({ entry: { id: entry.id, hidden: input.hidden }, changed: true });
});
