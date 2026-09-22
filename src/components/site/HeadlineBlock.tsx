import type { ReactNode } from "react";
import { Reveal } from "./Effects";

function CrossColumn() {
  return (
    <span className="n-cross-col shrink-0 flex-row md:flex-col" aria-hidden="true">
      <span className="n-cross" />
      <span className="n-cross" />
      <span className="n-cross" />
    </span>
  );
}

/** Centred headline flanked by crosshair columns, like the reference's section intros. */
export default function HeadlineBlock({ title, children, id, className = "" }: { title: ReactNode; children?: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`scroll-mt-24 px-4 py-20 md:py-28 ${className}`}>
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-8 md:flex-row">
        <CrossColumn />
        <Reveal className="flex w-full flex-col items-center gap-y-6 text-center">
          <h2 className="n-h2 max-w-[22ch]">{title}</h2>
          {children && <div className="n-body max-w-[76vw] lg:max-w-[52vw]">{children}</div>}
        </Reveal>
        <CrossColumn />
      </div>
    </section>
  );
}
