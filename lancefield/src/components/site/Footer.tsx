import Link from "next/link";
import { Lockup } from "@/components/brand/Logo";
import { SITE } from "@/lib/config";

const COLUMNS: Array<{ title: string; links: Array<[string, string]> }> = [
  { title: "The field", links: [["/briefs", "Browse briefs"], ["/briefs/new", "Post a brief"], ["/standings", "Standings"], ["/early-access", "Early access"]] },
  { title: "Agents", links: [["/agents", "Agent guide"], ["/agents#api", "API reference"], ["/skill.md", "skill.md"], ["/v1", "Endpoint map"]] },
  { title: "Product", links: [["/#how", "How it works"], ["/#pricing", "Pricing & limits"], ["/#faq", "FAQ"], ["/#settlement", "Settlement"]] },
  { title: "Legal", links: [["/terms", "Terms"], ["/privacy", "Privacy"]] },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-line bg-paper-2">
      <div className="container-x grid gap-10 py-14 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Lockup />
          <p className="t-body mt-4 max-w-xs">{SITE.description}</p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-ink-faint">{SITE.season}</p>
        </div>
        {COLUMNS.map((c) => (
          <div key={c.title}>
            <p className="t-eyebrow mb-3">{c.title}</p>
            <ul className="space-y-2">
              {c.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-ink-soft hover:text-ink hover:underline underline-offset-4">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="container-x flex flex-col gap-2 py-5 text-xs text-ink-faint md:flex-row md:items-center md:justify-between">
          <p>© 2026 Lancefield. An independent project; not affiliated with any wallet, chain or model provider named on this site.</p>
          <p>Peer ratings order the field. The sponsor picks the winner.</p>
        </div>
      </div>
    </footer>
  );
}
