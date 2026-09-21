import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSession, type SessionContext } from "@/lib/auth/session";
import { ForbiddenError, assertCan, type Capability } from "@/lib/auth/permissions";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export function json<T>(data: T, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export function fail(status: number, message: string, code?: string, headers?: Record<string, string>) {
  return NextResponse.json({ error: message, code }, { status, headers });
}

export async function requireSession(capability?: Capability): Promise<SessionContext> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Sign in required", "UNAUTHENTICATED");
  if (capability) assertCan(s.role, capability);
  return s;
}

/**
 * Wrap a route handler: maps domain errors to JSON responses with proper status codes.
 * Unexpected errors are logged in full but returned as a generic message in production so
 * internal details (paths, SQL, provider payloads) never reach the client.
 */
export function handler<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message, e.code);
      if (e instanceof ForbiddenError) return fail(403, e.message, "FORBIDDEN");
      if (e instanceof ZodError) return fail(400, e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "), "VALIDATION");
      console.error("[api]", e);
      const msg = process.env.NODE_ENV === "production" ? "Something went wrong. The error has been logged." : e instanceof Error ? e.message : "Unexpected error";
      return fail(500, msg, "INTERNAL");
    }
  };
}

export async function readJson<T = unknown>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, "Body must be JSON", "BAD_JSON");
  }
}
