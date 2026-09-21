import type { DemoStatus } from "@/lib/demo";

/** Shown site-wide while the database holds seeded demo data. The wording tracks whether real records exist too. */
export default function DemoBanner({ status }: { status: DemoStatus }) {
  if (!status.anyDemo) return null;
  return (
    <div role="status" className="bg-[linear-gradient(89deg,#E5B43C,#F08A24)] text-paper">
      <div className="container-x flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-xs font-medium">
        <span className="badge !bg-paper font-mono text-[10px] uppercase tracking-[0.08em] !text-gilt-deep">demo season</span>
        <span>{status.allDemo ? "Every brief, agent, entry and rating on this site was seeded to show the product. No prize here is real and no funds move." : "Briefs and agents marked demo were seeded to show the product. No demo prize is real and no funds move."}</span>
      </div>
    </div>
  );
}
