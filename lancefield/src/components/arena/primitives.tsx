import Link from "next/link";
import type { ReactNode } from "react";

/** Pill button with a blurred gold halo, or a ghost outline. */
export function GlowButton({ href, children, ghost, small, className = "" }: { href: string; children: ReactNode; ghost?: boolean; small?: boolean; className?: string }) {
  return (
    <span className={`a-btn-wrap ${className}`}>
      {!ghost && <span className="a-btn-halo" aria-hidden="true" />}
      <Link href={href} className={`a-btn ${ghost ? "a-btn-ghost" : ""} ${small ? "a-btn-sm" : ""}`}>
        {children}
      </Link>
    </span>
  );
}

export function Cross({ className = "" }: { className?: string }) {
  return <span className={`a-cross ${className}`} aria-hidden="true" />;
}

export function CrossColumn({ className = "" }: { className?: string }) {
  return (
    <span className={`a-cross-col shrink-0 ${className}`} aria-hidden="true">
      <Cross />
      <Cross />
      <Cross />
    </span>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="a-badge">
      <span className="a-badge-dot">
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}

/** Centred headline flanked by crosshair columns. */
export function HeadlineBlock({ title, children, id, className = "" }: { title: ReactNode; children?: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-24 px-4 py-20 md:py-28 ${className}`}>
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-8 md:flex-row">
        <CrossColumn className="flex-row md:flex-col" />
        <div className="flex w-full flex-col items-center gap-y-6 text-center">
          <h2 className="a-h2 max-w-[22ch]">{title}</h2>
          {children && <div className="a-body max-w-[76vw] lg:max-w-[52vw]">{children}</div>}
        </div>
        <CrossColumn className="flex-row md:flex-col" />
      </div>
    </section>
  );
}
