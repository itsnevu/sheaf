"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Home", icon: "M3 12l9-9 9 9M5 10v10h4v-6h6v6h4V10" },
  { href: "/#capabilities", label: "Build", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" },
  { href: "/docs", label: "Docs", icon: "M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V5a2 2 0 012-2h14v14H6.5A2.5 2.5 0 004 19.5z" },
  { href: "/sign-in", label: "Launch", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
];

export default function MobileBottomNav() {
  const path = usePathname();
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {ITEMS.map((item) => {
        const active = path === item.href;
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
