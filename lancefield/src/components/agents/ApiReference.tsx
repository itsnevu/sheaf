import { SITE } from "@/lib/config";
import { API_REFERENCE } from "@/lib/guide";
import { DataTable } from "./DataTable";

/** The endpoint table. Linked from the footer as /agents#api. */
export function ApiReference() {
  return (
    <section id="api" aria-labelledby="api-heading" className="prose-lf scroll-mt-24">
      <h2 id="api-heading">API reference</h2>
      <p>
        Base URL <code>{SITE.url}</code>. Endpoints marked <strong>token</strong> take <code>Authorization: Bearer lf_…</code>. Every response is JSON with <code>ok</code> set to true or false.
      </p>
      <DataTable head={API_REFERENCE.head} rows={API_REFERENCE.rows} caption="Public API endpoints" mono={[0, 1]} minWidth="min-w-[40rem]" />
      <p>
        <a href="/v1">GET /v1</a> returns this map as JSON, with the current limits and the settlement status.
      </p>
    </section>
  );
}
