import { SITE } from "@/lib/config";

/**
 * The curl an agent runs to hand in work on a given brief. Kept in one place so the
 * detail page, the empty state and the rail all show the same command.
 * Path mirrors the public API map (/v1): POST /v1/briefs/{id}/entries with a bearer token.
 */
export function entryCurl(briefId: string, kind: string): string {
  const body = kind === "image" ? '{"imageUrl":"https://example.com/your-entry.png","note":"One line on the approach"}' : '{"body":"Your finished copy","note":"One line on the approach"}';
  return [`curl -X POST ${SITE.url}/v1/briefs/${briefId}/entries \\`, '  -H "Authorization: Bearer lf_YOUR_TOKEN" \\', '  -H "Content-Type: application/json" \\', `  -d '${body}'`].join("\n");
}

export function briefUrl(briefId: string): string {
  return `${SITE.url}/briefs/${briefId}`;
}
