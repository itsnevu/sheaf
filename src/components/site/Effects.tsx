"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Site-wide interaction layer, mouse only where it says so:
 *  - pointer glow on .n-glow cards and .n-btn-wrap buttons (--x / --y in px)
 *  - 3D tilt on .n-tilt cards, magnetic pull on .n-magnet buttons
 *  - a spotlight on the hero (.n-spot) that follows the pointer (--mx / --my as fractions)
 *  - scroll-driven parallax on [data-parallax] (translateY by speed × distance from viewport centre)
 *  - reveal on entry for [data-reveal] (adds .is-in; stagger with --d)
 */
export default function Effects() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // Reveal on entry.
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.18 },
    );
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => io.observe(el));

    // Parallax.
    const px = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let raf = 0;
    const parallax = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of px) {
        const r = el.getBoundingClientRect();
        const centre = r.top + r.height / 2 - vh / 2;
        const speed = Number(el.dataset.parallax || 0.12);
        el.style.transform = `translate3d(0, ${(-centre * speed).toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(parallax);
    };
    if (!reduced && px.length) {
      parallax();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }

    // Pointer-driven effects.
    const onMove = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      const glow = t?.closest<HTMLElement>(".n-glow, .n-btn-wrap");
      if (glow) {
        const r = glow.getBoundingClientRect();
        glow.style.setProperty("--x", String(Math.round(e.clientX - r.left)));
        glow.style.setProperty("--y", String(Math.round(e.clientY - r.top)));
      }
      const tilt = t?.closest<HTMLElement>(".n-tilt");
      if (tilt) {
        const r = tilt.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = `perspective(900px) rotateX(${(-dy * 8).toFixed(2)}deg) rotateY(${(dx * 10).toFixed(2)}deg) translateZ(0)`;
      }
      const magnet = t?.closest<HTMLElement>(".n-magnet");
      if (magnet) {
        const r = magnet.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        magnet.style.transform = `translate(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.22).toFixed(1)}px)`;
      }
      const spot = t?.closest<HTMLElement>(".n-spot");
      if (spot) {
        const r = spot.getBoundingClientRect();
        spot.style.setProperty("--mx", ((e.clientX - r.left) / r.width).toFixed(3));
        spot.style.setProperty("--my", ((e.clientY - r.top) / r.height).toFixed(3));
      }
    };
    const onOut = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      const tilt = t?.closest<HTMLElement>(".n-tilt");
      if (tilt && !tilt.contains(e.relatedTarget as Node | null)) tilt.style.transform = "";
      const magnet = t?.closest<HTMLElement>(".n-magnet");
      if (magnet && !magnet.contains(e.relatedTarget as Node | null)) magnet.style.transform = "";
    };
    if (fine && !reduced) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerout", onOut, { passive: true });
    }

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerout", onOut);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return null;
}

/** Splits a heading into words that rise in one after another. Static text only. */
export function Words({ text, className = "", delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={`n-words ${className}`} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} aria-hidden="true" style={{ "--d": `${delay + i * 70}ms` } as React.CSSProperties}>
          {w}
          {i < text.split(" ").length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/** Reveal wrapper for server components: children fade and rise when scrolled into view. */
export function Reveal({ children, className = "", delay = 0, as: Tag = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" | "p" }) {
  return (
    <Tag data-reveal="" className={`n-reveal ${className}`} style={{ "--d": `${delay}ms` } as React.CSSProperties}>
      {children}
    </Tag>
  );
}
