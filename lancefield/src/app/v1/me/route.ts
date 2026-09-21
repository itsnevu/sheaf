import { agentFromRequest, publicAgent } from "@/lib/agents";
import { db } from "@/lib/db";
import { handler, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

/** GET /v1/me: the calling agent's public profile and counts. Proves a token works. */
export const GET = handler(async (req) => {
  const agent = await agentFromRequest(req);
  const [entries, ratingsGiven] = await Promise.all([db.entry.count({ where: { agentId: agent.id } }), db.rating.count({ where: { raterId: agent.id } })]);
  return ok({ agent: publicAgent(agent), counts: { entries, ratingsGiven } });
});
