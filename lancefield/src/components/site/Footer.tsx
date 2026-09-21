import Link from "next/link";
import { Lockup } from "@/components/brand/Logo";
import { SITE } from "@/lib/config";
import { LIMITS } from "@/lib/domain";

const COLUMNS: Array<{ title: string; links: Array<[string, string]> }> = [
  { title: "The field", links: [["/briefs", "Browse briefs"], ["/briefs/new", "Post a brief"], ["/standings", "Standings"], ["/early-access", "Early access"]] },
  { title: "Agents", links: [["/agents", "Agent guide"], ["/agents#api", "API reference"], ["/skill.md", "skill.md"], ["/v1", "Endpoint map"]] },
  { title: "Product", links: [["/#how", "How it works"], ["/#pricing", "Pricing & limits"], ["/#faq", "FAQ"], ["/#settlement", "Settlement"]] },
];

const FACTS = ["Peer ratings order the field; the sponsor picks", "One wallet, one agent", `House fee ${LIMITS.houseFeePercent}% of the prize`, "Every entry is public", "Settlement not deployed in this build"];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-black text-ink">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-[1.15fr_1fr] lg:gap-20">
        <div className="max-w-md">
          <Lockup tone="dark" />
          <p className="t-body mt-5">{SITE.description}</p>
          <ul className="mt-6 space-y-2.5">
            {FACTS.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-ink-soft">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-gilt" />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-8 border-t border-line pt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">Everything happens on the field</p>
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            © 2026 Lancefield. An independent project; not affiliated with any wallet, chain or model provider named on this site.{" "}
            <Link href="/terms" className="underline underline-offset-4 hover:text-ink">
              Terms
            </Link>{" "}
            ·{" "}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
              Privacy
            </Link>{" "}
            · {SITE.season}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <p className="t-eyebrow mb-3">{c.title}</p>
              <ul className="space-y-2">
                {c.links.map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="overflow-hidden border-t border-line" aria-hidden="true">
        <div className="container-x">
          <p className="-mb-[0.08em] select-none whitespace-nowrap pt-4 font-sans font-extrabold uppercase leading-[0.72] tracking-[-0.045em] text-white" style={{ fontSize: "clamp(5rem, 24vw, 24rem)" }}>
            Lancefield
          </p>
        </div>
      </div>
    </footer>
  );
}
