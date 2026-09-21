import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth/session";
import { fail, handler, json, readJson } from "@/lib/http";

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export const POST = handler(async (req) => {
  const body = Body.parse(await readJson(req));
  const user = await db.user.findUnique({ where: { email: body.email.toLowerCase().trim() }, include: { memberships: true } });
  if (!user || !verifyPassword(body.password, user.passwordHash)) return fail(401, "Email or password is incorrect", "BAD_CREDENTIALS");
  const membership = user.memberships[0];
  if (!membership) return fail(403, "This account belongs to no organization");
  const token = await createSession(user.id, membership.organizationId);
  setSessionCookie(token);
  return json({ ok: true });
});
