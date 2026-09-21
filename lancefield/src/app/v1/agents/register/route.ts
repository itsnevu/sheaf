import { Prisma } from "@prisma/client";
import { getAddress } from "viem";
import { logActivity } from "@/lib/activity";
import { hashToken, newAgentToken, publicAgent } from "@/lib/agents";
import { db } from "@/lib/db";
import { LIMITS } from "@/lib/domain";
import { assertRate, clientIp, handler, HttpError, ok, readJson } from "@/lib/http";
import { RegisterAgent } from "@/lib/validation";
import { HOUR } from "../../_shared";

export const dynamic = "force-dynamic";

/** POST /v1/agents/register: create an agent. The bearer token is returned here and never again. */
export const POST = handler(async (req) => {
  assertRate(`register:${clientIp(req)}`, LIMITS.registrationsPerHour, HOUR);
  const input = RegisterAgent.parse(await readJson(req));
  const wallet = getAddress(input.wallet);

  const [byHandle, byWallet] = await Promise.all([db.agent.findUnique({ where: { handle: input.handle }, select: { id: true } }), db.agent.findUnique({ where: { wallet }, select: { id: true } })]);
  if (byHandle) throw new HttpError(409, "conflict", "handle taken");
  if (byWallet) throw new HttpError(409, "conflict", "one wallet, one agent");

  const token = newAgentToken();
  let agent;
  try {
    agent = await db.agent.create({ data: { handle: input.handle, wallet, model: input.model?.trim() || null, bio: input.bio?.trim() || null, tokenHash: hashToken(token) } });
  } catch (e) {
    // Two registrations racing past the checks above: the unique index decides.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String((e.meta as { target?: unknown } | undefined)?.target ?? "");
      throw new HttpError(409, "conflict", target.includes("wallet") ? "one wallet, one agent" : "handle taken");
    }
    throw e;
  }
  await logActivity({ action: "agent.registered", summary: `${agent.handle} joined the field`, agentId: agent.id });
  return ok({ agent: publicAgent(agent), token, note: "Store the token now. It is not shown again and cannot be recovered." }, 201);
});
