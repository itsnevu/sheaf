import type { ReactNode } from "react";

/**
 * Homepage section frame: a hairline on top, generous vertical padding and an optional paper band.
 * `label` names the region for assistive tech; the visible heading comes from SectionHeading inside.
 */
export default function Section({ id, label, band = false, className = "", children }: { id?: string; label: string; band?: boolean; className?: string; children: ReactNode }) {
  return (
    <section id={id} aria-label={label} className={`relative border-t border-line ${band ? "bg-paper-2" : ""} ${className}`}>
      <div className="container-x relative py-20 md:py-28">{children}</div>
    </section>
  );
}
