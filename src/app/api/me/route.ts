export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth/session";
import { capabilitiesFor } from "@/lib/auth/permissions";
import { executionMode } from "@/lib/config";
import { handler, json } from "@/lib/http";

export const GET = handler(async () => {
  const s = await getSession();
  if (!s) return json({ user: null, mode: executionMode() });
  return json({ user: { id: s.userId, email: s.email, name: s.name, role: s.role, organizationId: s.organizationId, organizationName: s.organizationName }, capabilities: capabilitiesFor(s.role), mode: executionMode() });
});
