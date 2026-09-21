"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

/**
 * The flying courier that crosses the violet stage as the reader scrolls: pinned inside the
 * stage, drifting from one side to the other and rolling slightly with progress. Pointer
 * events are off so it never blocks the text. Reduced motion keeps it still.
 */
export default function StageMascot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const stage = el?.parentElement;
    if (!el || !stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = stage.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      const x = Math.sin(p * Math.PI * 3) * 28; // vw, weaves across the stage three times
      const y = Math.sin(p * Math.PI * 5) * 6; // vh bob
      const rot = Math.sin(p * Math.PI * 6) * 14;
      el.style.transform = `translate(${x}vw, ${y}vh) rotate(${rot}deg)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div className="pointer-events-none sticky top-0 z-[2] h-0 w-full overflow-visible" aria-hidden="true">
      <div ref={ref} className="absolute left-1/2 top-[30vh] w-[min(46vw,460px)] -translate-x-1/2 will-change-transform md:top-[24vh]">
        <Image src="/art/3d/mascot-fly.webp" alt="" width={900} height={900} sizes="(min-width: 768px) 520px, 52vw" className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,.45)]" />
      </div>
    </div>
  );
}
