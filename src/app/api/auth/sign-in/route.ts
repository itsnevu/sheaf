import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth/session";
import { fail, handler, json, readJson } from "@/lib/http";
import { clientIp, rateLimit } from "@/lib/ratelimit";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

const WINDOW_MS = 10 * 60_000;

export const POST = handler(async (req) => {
  const body = Body.parse(await readJson(req));
  const email = body.email.toLowerCase().trim();
  const byIp = rateLimit(`signin:ip:${clientIp(req)}`, { limit: 30, windowMs: WINDOW_MS });
  const byEmail = rateLimit(`signin:email:${email}`, { limit: 10, windowMs: WINDOW_MS });
  if (!byIp.ok || !byEmail.ok) {
    const retry = Math.max(byIp.retryAfterSec, byEmail.retryAfterSec);
    return fail(429, "Too many sign-in attempts. Try again in a few minutes.", "RATE_LIMITED", { "retry-after": String(retry) });
  }
  const user = await db.user.findUnique({ where: { email }, include: { memberships: true } });
  if (!user || !verifyPassword(body.password, user.passwordHash)) return fail(401, "Email or password is incorrect", "BAD_CREDENTIALS");
  const membership = user.memberships[0];
  if (!membership) return fail(403, "This account belongs to no organization");
  const token = await createSession(user.id, membership.organizationId);
  setSessionCookie(token);
  return json({ ok: true });
});
