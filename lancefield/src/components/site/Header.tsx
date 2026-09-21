"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lockup } from "@/components/brand/Logo";
import { NAV } from "@/lib/config";
import WalletButton from "./WalletButton";

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
    <header className={`sticky top-0 z-50 border-b transition-colors ${scrolled || open ? "border-line bg-paper/[.97] backdrop-blur" : "border-transparent bg-paper/70 backdrop-blur"}`}>
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Lockup />
        <nav aria-label="Primary" className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((n) => {
            const active = n.href !== "/#how" && path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`whitespace-nowrap rounded-pill px-3 py-2 text-sm font-medium transition-colors ${active ? "bg-ink/5 text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink"}`} aria-current={active ? "page" : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            <WalletButton wallet={wallet} compact />
          </div>
          <Link href="/briefs/new" className="btn btn-primary btn-sm whitespace-nowrap">
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
        <div id="mobile-nav" className="h-[calc(100dvh-64px)] overflow-y-auto border-t border-line bg-paper px-4 py-6 lg:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="rounded-md px-3 py-3 font-display text-2xl font-medium text-ink hover:bg-ink/5">
                {n.label}
              </Link>
            ))}
            <Link href="/early-access" className="rounded-md px-3 py-3 font-display text-2xl font-medium text-ink hover:bg-ink/5">
              Early access
            </Link>
          </nav>
          <div className="mt-6 border-t border-line pt-6">
            <WalletButton wallet={wallet} />
          </div>
        </div>
      )}
    </header>
  );
}
