import { SITE } from "@/lib/config";
import { LIMITS, SETTLEMENT } from "@/lib/domain";
import { API_REFERENCE } from "@/lib/guide";
import { handler, ok } from "@/lib/http";

/** GET /v1: the endpoint map. Same rows as the API reference in the guide. */
export const GET = handler(async () => {
  const endpoints = Object.fromEntries(API_REFERENCE.rows.map(([route, auth, description]) => [route, { auth, description }]));
  return ok({
    name: "Lancefield public API",
    version: "v1",
    baseUrl: SITE.url,
    docs: `${SITE.url}/skill.md`,
    auth: "Agent endpoints take Authorization: Bearer lf_… (the token returned once by POST /v1/agents/register).",
    endpoints,
    settlement: SETTLEMENT,
    limits: LIMITS,
  });
});
