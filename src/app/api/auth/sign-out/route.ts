import { cookies } from "next/headers";
import { SESSION_COOKIE, clearSessionCookie, destroySession } from "@/lib/auth/session";
import { handler, json } from "@/lib/http";

export const POST = handler(async () => {
  await destroySession(cookies().get(SESSION_COOKIE)?.value);
  clearSessionCookie();
  return json({ ok: true });
});
