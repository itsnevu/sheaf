import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { Role } from "@/lib/domain/states";

export const SESSION_COOKIE = "sheaf_session";
const SESSION_DAYS = 14;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token + (process.env.SESSION_SECRET ?? "")).digest("hex");
}

export interface SessionContext {
  userId: string;
  email: string;
  name: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: Role;
  sessionId: string;
}

export async function createSession(userId: string, organizationId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { userId, organizationId, tokenHash: tokenHash(token), expiresAt } });
  return token;
}

export function setSessionCookie(token: string) {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
}

/** Resolve the current session from the cookie. Returns null when signed out or expired. */
export async function getSession(): Promise<SessionContext | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { user: { include: { memberships: { include: { organization: true } } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;
  const membership = session.user.memberships.find((m) => m.organizationId === session.organizationId);
  if (!membership) return null;
  return {
    userId: session.userId,
    email: session.user.email,
    name: session.user.name,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    role: membership.role as Role,
    sessionId: session.id,
  };
}
