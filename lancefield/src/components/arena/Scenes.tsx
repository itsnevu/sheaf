"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { Badge } from "./primitives";

export interface Scene {
  head: string;
  body: string;
  badges?: string[];
  /** Object image under /art/3d (transparent WebP), shown on the opposite side of the text. */
  art?: string;
}

/**
 * The flying knight that crosses the stage as the reader scrolls: pinned inside the stage,
 * weaving from side to side and rolling slightly with progress. Reduced motion keeps it still.
 */
function StageMascot() {
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
      const x = Math.sin(p * Math.PI * 3) * 28;
      const y = Math.sin(p * Math.PI * 5) * 6;
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
        <Image src="/art/3d/mascot-fly.webp" alt="" width={900} height={900} sizes="(min-width: 768px) 460px, 46vw" className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,.5)]" />
      </div>
    </div>
  );
}

/** Deep-green stage with white bars: full-viewport statements that fade in as they enter, alternating sides. */
export default function Scenes({ items }: { items: Scene[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const scenes = Array.from(root.querySelectorAll<HTMLElement>(".a-scene"));
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.3 },
    );
    scenes.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="a-stage" aria-label="How the field works, in six statements">
      <StageMascot />
      {items.map((it, i) => (
        <section key={it.head} className="a-scene">
          <div className="a-scene-text w-full md:w-1/2 md:px-8">
            {it.badges && (
              <p className="mb-5 flex flex-wrap gap-x-6 gap-y-2">
                {it.badges.map((b) => (
                  <Badge key={b}>{b}</Badge>
                ))}
              </p>
            )}
            <h2 className="a-display text-white">{it.head}</h2>
            <p className="a-mono-line mt-5 max-w-[560px] text-white/90">{it.body}</p>
            <p className="a-label mt-4 text-white/60">
              — {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")} —
            </p>
          </div>
          {it.art && (
            <div className={`a-float pointer-events-none absolute hidden w-[min(30vw,340px)] md:block ${i % 2 === 0 ? "right-[8vw]" : "left-[8vw]"}`} style={{ animationDelay: `${(i % 3) * -1.3}s` }} aria-hidden="true">
              <Image src={`/art/3d/${it.art}.webp`} alt="" width={900} height={900} sizes="30vw" className="w-full" />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
