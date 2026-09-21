"use client";

import { useEffect } from "react";

/** Tracks the pointer inside .n-glow and .n-btn-wrap elements via --x/--y (px), mouse only. */
export default function PointerGlow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(".n-glow, .n-btn-wrap");
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
