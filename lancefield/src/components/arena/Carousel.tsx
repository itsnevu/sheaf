"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Horizontal, scroll-snapped strip with white square arrow buttons. */
export default function Carousel({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [canPrev, setPrev] = useState(false);
  const [canNext, setNext] = useState(true);
  const update = () => {
    const el = ref.current;
    if (!el) return;
    setPrev(el.scrollLeft > 4);
    setNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };
  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const child = el.firstElementChild as HTMLElement | null;
    el.scrollBy({ left: dir * (child?.clientWidth ?? el.clientWidth * 0.8), behavior: "smooth" });
  };
  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="a-carousel" role="region" aria-label={label} tabIndex={0}>
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 md:-mx-8">
        <button type="button" className="a-arrow pointer-events-auto" onClick={() => go(-1)} disabled={!canPrev} aria-label="Previous">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <button type="button" className="a-arrow pointer-events-auto" onClick={() => go(1)} disabled={!canNext} aria-label="Next">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
