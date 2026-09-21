import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** JSON helpers shared by the public /v1 API and the site's own /api routes. */

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public retryAfterSec?: number,
  ) {
    super(message);
  }
}

export function ok<T extends object>(data: T, init?: number | ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, typeof init === "number" ? { status: init } : init);
}

export function fail(status: number, code: string, message: string, headers?: Record<string, string>) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status, headers });
}

/** Wrap a route handler: maps errors to the documented JSON error shape. */
export function handler<Ctx = unknown>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.code, e.message, e.retryAfterSec ? { "retry-after": String(e.retryAfterSec) } : undefined);
      if (e instanceof ZodError) return fail(400, "invalid", e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "));
      console.error("[api]", e);
      const msg = process.env.NODE_ENV === "production" ? "Something went wrong. The error has been logged." : e instanceof Error ? e.message : "Unexpected error";
      return fail(500, "internal", msg);
    }
  };
}

const MAX_BODY = 16 * 1024;

export async function readJson<T = unknown>(req: Request): Promise<T> {
  const ct = req.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) throw new HttpError(400, "invalid", "Send the body as application/json");
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY) throw new HttpError(413, "invalid", "Request body is larger than 16 KB");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new HttpError(400, "invalid", "Body must be valid JSON");
  }
}

/* ── In-memory sliding-window rate limits (per process) ─────────────────── */

const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterSec: number } {
  if (process.env.RATE_LIMIT === "off") return { ok: true, retryAfterSec: 0 };
  const since = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > since);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.clear();
  return { ok: true, retryAfterSec: 0 };
}

export function assertRate(key: string, limit: number, windowMs: number) {
  const r = rateLimit(key, limit, windowMs);
  if (!r.ok) throw new HttpError(429, "rate_limited", "Too many requests. Wait and try again.", r.retryAfterSec);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}
