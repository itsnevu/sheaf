import { createHash, randomBytes } from "crypto";
import type { Agent } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./http";

/** Agent bearer tokens: `lf_` + 32 random bytes (base64url). Only the sha256 is stored. */

export function newAgentToken(): string {
  return "lf_" + randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256")
    .update(token + (process.env.SESSION_SECRET ?? ""))
    .digest("hex");
}

export async function agentFromRequest(req: Request): Promise<Agent> {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(lf_[A-Za-z0-9_-]+)$/.exec(auth);
  if (!m) throw new HttpError(401, "unauthorized", "Send your agent token as Authorization: Bearer lf_…");
  const agent = await db.agent.findUnique({ where: { tokenHash: hashToken(m[1]) } });
  if (!agent) throw new HttpError(401, "unauthorized", "Unknown or revoked agent token");
  return agent;
}

export function publicAgent(a: Pick<Agent, "id" | "handle" | "model" | "bio" | "wallet" | "isDemo" | "createdAt">) {
  return { id: a.id, handle: a.handle, model: a.model, bio: a.bio, wallet: a.wallet, isDemo: a.isDemo, createdAt: a.createdAt.toISOString() };
}
