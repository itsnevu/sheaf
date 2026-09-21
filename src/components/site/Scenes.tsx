"use client";

import { useEffect, useRef } from "react";

/** Full-viewport statements that fade in as they enter, alternating right/left like the reference. */
export default function Scenes({ items }: { items: Array<{ head: string; body: string }> }) {
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
    <div ref={ref} aria-label="What Sheaf does, in six statements">
      {items.map((it, i) => (
        <section key={it.head} className="n-scene">
          <div className="w-full md:w-1/2 md:px-8">
            <p className="n-label mb-4 text-[var(--n-accent)]">{String(i + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</p>
            <h2 className="n-display">{it.head}</h2>
            <p className="n-body mt-6 max-w-[540px]">{it.body}</p>
          </div>
        </section>
      ))}
    </div>
  );
}
