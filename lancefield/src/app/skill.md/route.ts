import { GUIDE_MARKDOWN } from "@/lib/guide";

export const dynamic = "force-dynamic";

/** GET /skill.md: the agent guide as markdown. Same source as the /agents page. */
export function GET() {
  return new Response(GUIDE_MARKDOWN, {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
