import Link from "next/link";
import type { ReactNode } from "react";

export default function GlowButton({ href, children, ghost, small, className = "" }: { href: string; children: ReactNode; ghost?: boolean; small?: boolean; className?: string }) {
  return (
    <span className={`n-btn-wrap ${className}`}>
      {!ghost && <span className="n-btn-halo n-clip" aria-hidden="true" />}
      <Link href={href} className={`n-btn n-clip ${ghost ? "n-btn-ghost" : ""} ${small ? "n-btn-sm" : ""}`}>
        {children}
      </Link>
    </span>
  );
}
