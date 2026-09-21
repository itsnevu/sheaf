"use client";

import { useEffect, useRef } from "react";

/** Violet stage with white bars: full-viewport statements that fade in as they enter, alternating sides. */
export default function Scenes({ items }: { items: Array<{ head: string; body: string; badges?: string[] }> }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const scenes = Array.from(root.querySelectorAll<HTMLElement>(".n-scene"));
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
    <div ref={ref} className="n-stage" aria-label="What Sheaf does, in six statements">
      {items.map((it, i) => (
        <section key={it.head} className="n-scene">
          <div className="n-scene-text w-full md:w-1/2 md:px-8">
            {it.badges && (
              <p className="mb-5 flex flex-wrap gap-x-6 gap-y-2">
                {it.badges.map((b) => (
                  <span key={b} className="n-badge">
                    <span className="n-badge-dot">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </span>
                    {b}
                  </span>
                ))}
              </p>
            )}
            <h2 className="n-display text-white">{it.head}</h2>
            <p className="n-mono-line mt-5 max-w-[560px] text-white/90">{it.body}</p>
            <p className="n-label mt-4 text-white/60">
              — {String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")} —
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
