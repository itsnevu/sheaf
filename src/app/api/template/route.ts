import { csvTemplate } from "@/lib/csv/validate";

/** Leg CSV template: label,address,asset,amount,not_before,memo. */
export async function GET(req: Request) {
  const asset = new URL(req.url).searchParams.get("asset") || "USDG";
  return new Response(csvTemplate(asset.replace(/[^A-Za-z0-9]/g, "").slice(0, 10) || "USDG") + "\n", {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="sheaf-legs-template.csv"' },
  });
}
