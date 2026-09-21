"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "@/components/Logo";

const NAV = [
  { href: "/#product", label: "Product" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/security", label: "Security" },
  { href: "/docs", label: "Docs" },
];

export default function SiteHeader({ signedIn, mode }: { signedIn: boolean; mode: "demo" | "real" }) {
  const [open, setOpen] = useState(false);
  const [strip, setStrip] = useState(true);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {strip && (
        <div className="n-strip" role="status">
          <div className="n-strip-halo" aria-hidden="true" />
          <div className="relative flex items-center justify-center px-10 py-[5px]">
            <p className="n-label text-white">{mode === "demo" ? "Demo environment · no real funds are transferred · every record labelled simulated" : "Real mode · routes quoted live · signed by your treasury wallet"}</p>
            <button type="button" onClick={() => setStrip(false)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100" aria-label="Dismiss notice">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="n-header-bar flex h-16 w-full items-center justify-between px-4 md:px-8">
        <Link href="/" aria-label="Sheaf home" className="flex items-center gap-2.5">
          <Mark size={26} inverted />
          <span className="n-label !text-[15px] tracking-[-0.03em]">Sheaf</span>
        </Link>
        <div className="flex items-center gap-x-6 md:gap-x-8">
          <nav aria-label="Primary" className="hidden items-center gap-x-8 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="n-nav-link n-label" aria-current={path === n.href ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          {!signedIn && (
            <Link href="/sign-in" className="n-nav-link n-label hidden md:inline">
              Sign in
            </Link>
          )}
          <Link href={signedIn ? "/app" : "/sign-up"} className="n-clip flex h-[38px] items-center bg-[var(--n-accent)] px-5 n-label text-[#05110f] hover:brightness-110">
            {signedIn ? "Open app" : "Open app"}
          </Link>
          <button type="button" className="n-burger flex flex-col gap-[6px] md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Menu"} onClick={() => setOpen((o) => !o)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-nav" className="h-[calc(100dvh-64px)] overflow-y-auto bg-[#050606]/95 px-6 py-8 backdrop-blur md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-6">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="n-h3">
                {n.label}
              </Link>
            ))}
            <Link href={signedIn ? "/app" : "/sign-in"} className="n-h3 text-[var(--n-accent)]">
              {signedIn ? "Dashboard" : "Sign in"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
