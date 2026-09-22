"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Hero slot for the courier: shows the poster image at once, and swaps in the 3D model (loaded
 * in its own chunk, only when the hero is near the viewport, WebGL works and motion is allowed).
 */
const Mascot3D = dynamic(() => import("./Mascot3D"), { ssr: false });

export default function MascotSlot({ className = "" }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<"poster" | "model" | "failed">("poster");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = document.createElement("canvas");
    if (!(canvas.getContext("webgl2") || canvas.getContext("webgl"))) return;
    const el = wrap.current;
    if (!el) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          // Confirm the model exists before pulling in the 3D chunk; a missing file keeps the poster.
          fetch("/art/3d/mascot.glb", { method: "HEAD" })
            .then((r) => {
              if (cancelled) return;
              if (r.ok) setReady(true);
              else setState("failed");
            })
            .catch(() => !cancelled && setState("failed"));
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className={`relative aspect-square w-full ${className}`} data-mascot={state}>
      <Image src="/art/3d/mascot.webp" alt="Sheaf's courier: a small white robot holding a stack of cards bound with a pink band." width={900} height={900} priority sizes="(min-width: 1024px) 40vw, 90vw" className={`n-float relative w-full drop-shadow-[0_40px_80px_rgba(0,0,0,.6)] transition-opacity duration-700 ${state === "model" ? "opacity-0" : "opacity-100"}`} />
      {ready && state !== "failed" && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${state === "model" ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
          <Mascot3D onLoaded={(ok) => setState(ok ? "model" : "failed")} />
        </div>
      )}
    </div>
  );
}
