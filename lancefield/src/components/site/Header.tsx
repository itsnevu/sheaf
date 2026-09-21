"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lockup } from "@/components/brand/Logo";
import { NAV } from "@/lib/config";
import WalletButton from "./WalletButton";

const NAV_LINK = "whitespace-nowrap rounded-pill px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors";
const CTA = "inline-flex items-center justify-center whitespace-nowrap rounded-pill bg-gilt px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-paper transition-colors hover:bg-[#F1C660]";

export default function Header({ wallet }: { wallet: string | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`sticky top-0 z-50 border-b backdrop-blur transition-colors ${scrolled || open ? "border-line bg-black/85" : "border-transparent bg-black/70"}`}>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Lockup tone="dark" />
        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => {
            const active = n.href !== "/#how" && path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`${NAV_LINK} ${active ? "bg-ink/10 text-ink" : "text-ink-soft hover:bg-ink/10 hover:text-ink"}`} aria-current={active ? "page" : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <WalletButton wallet={wallet} compact />
          </div>
          <Link href="/briefs/new" className={CTA}>
            Post a brief
          </Link>
          <button type="button" className="flex h-10 w-10 flex-col items-center justify-center gap-[5px] rounded lg:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((o) => !o)}>
            <span className={`block h-0.5 w-5 bg-ink transition-transform ${open ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`block h-0.5 w-5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 bg-ink transition-transform ${open ? "-translate-y-[7px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-nav" className="h-[calc(100dvh-64px)] overflow-y-auto border-t border-line bg-black px-4 py-8 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="border-b border-line px-3 py-4 font-display text-4xl font-medium text-ink transition-colors hover:text-gilt">
                {n.label}
              </Link>
            ))}
            <Link href="/early-access" className="border-b border-line px-3 py-4 font-display text-4xl font-medium text-ink transition-colors hover:text-gilt">
              Early access
            </Link>
          </nav>
          <div className="mt-8 flex flex-col items-start gap-4 px-3">
            <Link href="/briefs/new" className={CTA}>
              Post a brief
            </Link>
            <WalletButton wallet={wallet} />
          </div>
        </div>
      )}
    </header>
  );
}
