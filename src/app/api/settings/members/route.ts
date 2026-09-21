export const dynamic = "force-dynamic";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { hashPassword } from "@/lib/auth/session";
import { ROLES } from "@/lib/domain/states";
import { fail, handler, json, readJson, requireSession } from "@/lib/http";

const Add = z.object({ name: z.string().min(1).max(80), email: z.string().email(), role: z.enum(ROLES), password: z.string().min(10).optional() });

/** Add a member. Creates the user with a temporary password if they do not exist yet. */
export const POST = handler(async (req) => {
  const s = await requireSession("members.manage");
  const body = Add.parse(await readJson(req));
  const email = body.email.toLowerCase().trim();
  let user = await db.user.findUnique({ where: { email } });
  let tempPassword: string | null = null;
  if (!user) {
    tempPassword = body.password ?? `pv-${Math.random().toString(36).slice(2, 8)}-${Math.random().toString(36).slice(2, 8)}`;
    user = await db.user.create({ data: { name: body.name.trim(), email, passwordHash: hashPassword(tempPassword) } });
  }
  const existing = await db.membership.findUnique({ where: { userId_organizationId: { userId: user.id, organizationId: s.organizationId } } });
  if (existing) return fail(409, "Already a member");
  const m = await db.membership.create({ data: { userId: user.id, organizationId: s.organizationId, role: body.role } });
  await audit({ organizationId: s.organizationId, actorId: s.userId, actorEmail: s.email, action: "member.added", summary: `${email} added as ${body.role.toLowerCase().replace("_", " ")}` });
  return json({ member: { id: m.id, userId: user.id, name: user.name, email, role: m.role }, tempPassword }, 201);
});

const Patch = z.object({ membershipId: z.string(), role: z.enum(ROLES) });

export const PATCH = handler(async (req) => {
  const s = await requireSession("members.manage");
  const body = Patch.parse(await readJson(req));
  const m = await db.membership.findFirst({ where: { id: body.membershipId, organizationId: s.organizationId }, include: { user: true } });
  if (!m) return fail(404, "Member not found");
  if (m.role === "OWNER" && body.role !== "OWNER") {
    const owners = await db.membership.count({ where: { organizationId: s.organizationId, role: "OWNER" } });
    if (owners <= 1) return fail(409, "The organization needs at least one owner");
  }
  await db.membership.update({ where: { id: m.id }, data: { role: body.role } });
  await audit({ organizationId: s.organizationId, actorId: s.userId, actorEmail: s.email, action: "member.role_changed", summary: `${m.user.email} is now ${body.role.toLowerCase().replace("_", " ")}` });
  return json({ ok: true });
});

export const DELETE = handler(async (req) => {
  const s = await requireSession("members.manage");
  const id = new URL(req.url).searchParams.get("membershipId");
  const m = await db.membership.findFirst({ where: { id: id ?? "", organizationId: s.organizationId }, include: { user: true } });
  if (!m) return fail(404, "Member not found");
  if (m.userId === s.userId) return fail(409, "You cannot remove yourself");
  if (m.role === "OWNER") {
    const owners = await db.membership.count({ where: { organizationId: s.organizationId, role: "OWNER" } });
    if (owners <= 1) return fail(409, "The organization needs at least one owner");
  }
  await db.membership.delete({ where: { id: m.id } });
  await db.session.deleteMany({ where: { userId: m.userId, organizationId: s.organizationId } });
  await audit({ organizationId: s.organizationId, actorId: s.userId, actorEmail: s.email, action: "member.removed", summary: `${m.user.email} removed` });
  return json({ ok: true });
});
