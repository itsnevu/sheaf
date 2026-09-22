"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Mark } from "@/components/Logo";

const NAV = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Under the hood" },
  { href: "/security", label: "Security" },
  { href: "/docs", label: "Docs" },
];

export default function SiteHeader({ signedIn, mode }: { signedIn: boolean; mode: "demo" | "real" }) {
  const [open, setOpen] = useState(false);
  const [strip, setStrip] = useState(true);
  const [hidden, setHidden] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    let last = window.scrollY;
    const on = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 240 && !open);
      last = y;
    };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [open]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`n-header-anim fixed inset-x-0 top-0 z-50 ${hidden ? "n-header-hide" : ""}`}>
      {strip && (
        <div className="n-strip" role="status">
          <div className="relative flex items-center justify-center px-10 py-[6px]">
            <p>
              {mode === "demo" ? (
                <>
                  The demo workspace is open.{" "}
                  <Link href="/sign-in" className="font-bold hover:underline">
                    Sign in with a seeded account →
                  </Link>
                </>
              ) : (
                <>
                  Real mode · routes quoted live · <strong>signed by your treasury wallet</strong>
                </>
              )}
            </p>
            <button type="button" onClick={() => setStrip(false)} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100" aria-label="Dismiss notice">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </button>
          </div>
        </div>
      )}
      <div className="n-header-bar flex h-16 w-full items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="Sheaf home" className="flex items-center gap-2.5">
          <Mark size={28} inverted accent="#ff2e55" />
          <span className="font-sans text-[22px] font-extrabold uppercase tracking-[-0.04em] text-white">Sheaf</span>
        </Link>
        <div className="flex items-center gap-x-6 md:gap-x-7">
          <nav aria-label="Primary" className="hidden items-center gap-x-7 md:flex">
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
          <Link href={signedIn ? "/app" : "/sign-up"} className="n-pill">
            Open app
          </Link>
          <button type="button" className="n-burger flex flex-col gap-[6px] md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Close menu" : "Menu"} onClick={() => setOpen((o) => !o)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-nav" className="h-[calc(100dvh-64px)] overflow-y-auto bg-black/95 px-6 py-8 backdrop-blur md:hidden">
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
