import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth/session";
import { fail, handler, json, readJson } from "@/lib/http";

const Body = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(10, "Use at least 10 characters"),
  organization: z.string().min(2).max(80),
});

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "org";
}

export const POST = handler(async (req) => {
  const body = Body.parse(await readJson(req));
  const email = body.email.toLowerCase().trim();
  if (await db.user.findUnique({ where: { email } })) return fail(409, "An account with this email already exists", "EMAIL_TAKEN");
  let slug = slugify(body.organization);
  if (await db.organization.findUnique({ where: { slug } })) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  const org = await db.organization.create({ data: { name: body.organization.trim(), slug } });
  const user = await db.user.create({ data: { name: body.name.trim(), email, passwordHash: hashPassword(body.password) } });
  await db.membership.create({ data: { userId: user.id, organizationId: org.id, role: "OWNER" } });
  await audit({ organizationId: org.id, actorId: user.id, actorEmail: email, action: "organization.created", summary: `Organization “${org.name}” created` });
  const token = await createSession(user.id, org.id);
  setSessionCookie(token);
  return json({ ok: true, organizationId: org.id });
});
