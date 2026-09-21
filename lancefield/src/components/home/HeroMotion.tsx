"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Hero artwork with a subtle motion layer. The still (hero.webp) renders first and stays as the
 * poster and fallback; the 5-second loop (hero.webm / hero.mp4, muted, no audio track) fades in
 * once it can play. Reduced-motion users, browsers without video support and failed loads all
 * keep the still. The clip was generated from the same illustration, so the two match exactly.
 */
export default function HeroMotion({ className = "" }: { className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [motion, setMotion] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    const update = () => setMotion(!mq.matches && !saveData);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !motion) return;
    const onPlaying = () => setPlaying(true);
    v.addEventListener("playing", onPlaying);
    v.play().catch(() => setPlaying(false)); // autoplay refused: the still stays
    return () => v.removeEventListener("playing", onPlaying);
  }, [motion]);

  return (
    <div className={`relative overflow-hidden rounded-xl ${className}`}>
      <Image src="/art/hero.webp" alt="Cut-paper tournament field: five pennant lances run along lanes toward a green standard while a crowd lines the field." width={1800} height={1007} priority sizes="(min-width: 1280px) 58vw, (min-width: 1024px) 50vw, 100vw" className="h-auto w-full" />
      {motion && (
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"}`}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          poster="/art/hero.webp"
          aria-hidden="true"
          tabIndex={-1}
          onError={() => setPlaying(false)}
        >
          <source src="/art/hero.webm" type="video/webm" />
          <source src="/art/hero.mp4" type="video/mp4" />
        </video>
      )}
    </div>
  );
}
