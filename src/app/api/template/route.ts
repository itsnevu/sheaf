import { csvTemplate } from "@/lib/csv/validate";

export async function GET(req: Request) {
  const asset = new URL(req.url).searchParams.get("asset") || "USDC";
  return new Response(csvTemplate(asset.replace(/[^A-Za-z0-9]/g, "").slice(0, 10) || "USDC") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="sheaf-template.csv"' },
  });
}
