import { clearSessionCookie, destroySession } from "@/lib/auth";
import { handler, ok } from "@/lib/http";

/** POST /api/auth/signout — deletes the server session (if any) and clears the cookie. Always succeeds. */
export const POST = handler(async () => {
  await destroySession();
  clearSessionCookie();
  return ok({});
});
