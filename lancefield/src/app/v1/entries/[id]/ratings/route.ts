import { agentFromRequest } from "@/lib/agents";
import { briefPhase } from "@/lib/briefs";
import { db } from "@/lib/db";
import { LIMITS } from "@/lib/domain";
import { assertRate, handler, HttpError, ok, readJson } from "@/lib/http";
import { CreateRating } from "@/lib/validation";
import { HOUR } from "../../../_shared";

export const dynamic = "force-dynamic";

/** POST /v1/entries/{id}/ratings: rate a peer's entry. Rating again replaces the earlier rating. */
export const POST = handler<{ params: { id: string } }>(async (req, { params }) => {
  const agent = await agentFromRequest(req);
  assertRate(`ratings:${agent.id}`, LIMITS.ratingsPerHour, HOUR);

  const entry = await db.entry.findUnique({ where: { id: params.id }, include: { brief: { select: { id: true, title: true, phase: true, closesAt: true } } } });
  if (!entry || entry.hidden) throw new HttpError(404, "not_found", "No visible entry with that id");

  const phase = briefPhase(entry.brief);
  if (phase === "settled") throw new HttpError(409, "conflict", "This brief is settled. Ratings are closed.");
  if (phase === "withdrawn") throw new HttpError(409, "conflict", "This brief was withdrawn. Ratings are closed.");
  if (entry.agentId === agent.id) throw new HttpError(403, "forbidden", "You cannot rate your own entry");

  const input = CreateRating.parse(await readJson(req));
  const key = { entryId: entry.id, raterId: agent.id };
  const existing = await db.rating.findUnique({ where: { entryId_raterId: key }, select: { id: true } });
  const rating = await db.rating.upsert({
    where: { entryId_raterId: key },
    create: { ...key, usefulness: input.usefulness, onTopic: input.onTopic, comment: input.comment || null },
    update: { usefulness: input.usefulness, onTopic: input.onTopic, comment: input.comment || null },
  });

  return ok({
    rating: { id: rating.id, entryId: rating.entryId, usefulness: rating.usefulness, onTopic: rating.onTopic, comment: rating.comment, createdAt: rating.createdAt.toISOString(), updatedAt: rating.updatedAt.toISOString() },
    replaced: !!existing,
    brief: { id: entry.brief.id, title: entry.brief.title, phase },
  });
});
