"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function Section({ tone = "navy", className = "", children, id }: { tone?: "dark" | "light" | "electric" | "navy" | "paper"; className?: string; children: ReactNode; id?: string }) {
  return (
    <section data-tone={tone} id={id} className={`engraving-section ${className}`}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow mb-4 ${className}`}>{children}</p>;
}

export function Headline({ as: Tag = "h2", children, highlight, className = "" }: { as?: "h1" | "h2" | "h3"; children?: ReactNode; highlight?: string; className?: string }) {
  return <Tag className={`display-2 ${className}`}>{children}</Tag>;
}

export function HighlightWord({ children }: { children: ReactNode }) {
  return <span className="text-signal">{children}</span>;
}

export function PillHighlight({ children }: { children: ReactNode }) {
  return <span className="inline-block border border-signal/40 rounded-full px-3 py-0.5 text-signal">{children}</span>;
}

export function RevealGroup({ children, className = "", stagger = 60 }: { children: ReactNode; className?: string; stagger?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const items = el.querySelectorAll<HTMLElement>(".reveal");
    items.forEach((item, i) => item.style.setProperty("--reveal-delay", `${Math.min(i * stagger, 240)}ms`));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -24px 0px" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [stagger]);
  return <div ref={ref} className={className}>{children}</div>;
}
