"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** Tracks the pointer inside .a-glow and .a-btn-wrap elements via --x/--y (px), mouse only. */
export function PointerGlow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".a-glow, .a-btn-wrap");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--x", String(Math.round(e.clientX - r.left)));
      el.style.setProperty("--y", String(Math.round(e.clientY - r.top)));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);
  return null;
}

/** "Scroll to see how it works" with three cascading chevrons; hides once the reader scrolls. */
export function ScrollCue() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const on = () => setHidden(window.scrollY > window.innerHeight * 0.6);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="a-cue" style={{ opacity: hidden ? 0 : 1 }} aria-hidden="true">
      <p className="a-label mb-2 text-white/90">Scroll to see how it works</p>
      <div className="a-cue-svgs">
        {[0, 1, 2].map((i) => (
          <span key={i}>
            <svg width="14" height="12" viewBox="0 0 14 12" fill="none" stroke="#E5B43C" strokeWidth="2">
              <path d="M1 1l6 6 6-6" />
            </svg>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Intro curtain: three objects pop in, then the curtain lifts. Shown once per browser session. */
export function IntroLoader() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem("lf-intro")) return;
      sessionStorage.setItem("lf-intro", "1");
    } catch {
      /* storage unavailable: show once */
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 2200);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  // Portalled to <body> so it covers the sticky header, which lives outside the arena's stacking context.
  return createPortal(
    <div className="a-loader" aria-hidden="true">
      {["obj-brief", "obj-pennant", "mascot"].map((n) => (
        <span key={n}>
          <Image src={`/art/3d/${n}.webp`} alt="" width={112} height={112} className="h-14 w-14" />
        </span>
      ))}
    </div>,
    document.body,
  );
}
