"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ITEMS = [
  { href: "/", label: "__Index" },
  { href: "/app", label: "APP_###" },
  { href: "/docs", label: "DOCS_###" },
  { href: "/security", label: "SEC_###" },
  { href: "/privacy", label: "PRIV_###" },
  { href: "/sign-in", label: "SIGN_IN" },
];

/** Red mark top-left; opens a bordered mono list of the site's instruments. */
export default function PrintNav({ signedIn = false }: { signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    document.querySelector(".site-print")?.classList.remove("is-leaving");
  }, [pathname]);
  const leave = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setOpen(false);
    const site = document.querySelector(".site-print");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!site || reduced) {
      router.push(href);
      return;
    }
    site.classList.add("is-leaving");
    window.setTimeout(() => router.push(href), 170);
  };
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => !(e.target as HTMLElement).closest(".p-nav") && setOpen(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open]);
  const items = ITEMS.map((i) => (i.href === "/sign-in" && signedIn ? { href: "/app", label: "OPEN_APP" } : i)).filter((i, idx, arr) => arr.findIndex((x) => x.href === i.href) === idx);
  return (
    <div className="p-nav">
      <button type="button" className="p-burger" aria-expanded={open} aria-controls="p-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)}>
        <span />
        <span />
        <span />
      </button>
      <nav id="p-menu" className="p-menu" data-open={open} aria-label="Primary">
        {items.map((i, idx) =>
          pathname === i.href ? (
            <span key={i.href} className="is-current" aria-current="page" style={{ "--i": idx } as React.CSSProperties}>
              {i.label}
            </span>
          ) : (
            <Link key={i.href} href={i.href} onClick={(e) => leave(e, i.href)} style={{ "--i": idx } as React.CSSProperties}>
              {i.label}
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
