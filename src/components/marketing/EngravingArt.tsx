"use client";

import dynamic from "next/dynamic";
const ParticlePortrait = dynamic(() => import("./ParticlePortrait"), { ssr: false });

export function ArtCredit() {
  return <a className="art-credit micro" href="https://commons.wikimedia.org/wiki/File:Flammarion.jpg" target="_blank" rel="noreferrer">Art: anonymous, 1888, public domain. Dithered by Raqio. ↗</a>;
}

export default function EngravingArt({ interactive = false, variant = 0, className = "" }: { interactive?: boolean; variant?: number; className?: string }) {
  return <div className={`engraving-art engraving-crop-${variant} ${className}`} aria-hidden="true">
    <div className="engraving-plate" />
    {interactive && <ParticlePortrait />}
  </div>;
}
