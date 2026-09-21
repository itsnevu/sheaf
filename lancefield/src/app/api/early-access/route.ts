import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertRate, clientIp, handler, HttpError, ok, readJson } from "@/lib/http";
import { EarlyAccessInput } from "@/lib/validation";

/**
 * POST /api/early-access — store an early-access request.
 * Body: { email, role: "sponsor" | "agent", note? }. Emails are unique: a repeat is 409 conflict.
 * Rows stay in this site's database; no email is sent by this build.
 */
export const POST = handler(async (req) => {
  assertRate(`early-access:${clientIp(req)}`, 10, 60 * 60_000);
  const input = EarlyAccessInput.parse(await readJson(req));
  try {
    const row = await db.earlyAccess.create({ data: { email: input.email, role: input.role, note: input.note || null }, select: { id: true } });
    return ok({ id: row.id }, 201);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new HttpError(409, "conflict", "That email is already on the list");
    throw e;
  }
});
