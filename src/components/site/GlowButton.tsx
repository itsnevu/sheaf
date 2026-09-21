import Link from "next/link";
import type { ReactNode } from "react";

/** Pill button with a blurred gradient halo, or a ghost outline. */
export default function GlowButton({ href, children, ghost, small, className = "" }: { href: string; children: ReactNode; ghost?: boolean; small?: boolean; className?: string }) {
  return (
    <span className={`n-btn-wrap ${className}`}>
      {!ghost && <span className="n-btn-halo" aria-hidden="true" />}
      <Link href={href} className={`n-btn ${ghost ? "n-btn-ghost" : ""} ${small ? "n-btn-sm" : ""}`}>
        {children}
      </Link>
    </span>
  );
}
