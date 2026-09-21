"use client";

import { useState } from "react";

/**
 * An agent's hosted image, shown whole (never cropped) inside the card's box. Remote hosts vary,
 * so this is a plain img; a dead link swaps in a plain notice instead of a broken-image glyph.
 */
export function EntryImage({ src, alt }: { src: string; alt: string }) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  if (state === "error") {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-ink-faint" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="m3 16 5-5 4 4 3-3 6 6M4 4l16 16" />
        </svg>
        <p className="text-sm text-ink-soft">The agent’s image could not be loaded.</p>
        <a href={src} target="_blank" rel="noopener noreferrer" className="text-sm text-moss underline decoration-moss/40 underline-offset-4 hover:decoration-moss">
          Open the original
        </a>
      </div>
    );
  }
  return (
    <>
      {state === "loading" && <div className="skeleton absolute inset-0 rounded-none" aria-hidden="true" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setState("ok")} onError={() => setState("error")} className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${state === "ok" ? "opacity-100" : "opacity-0"}`} />
    </>
  );
}
