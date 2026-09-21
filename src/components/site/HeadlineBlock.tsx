import type { ReactNode } from "react";

/** Centred headline flanked by two dashed bars, like the reference's section intros. */
export default function HeadlineBlock({ title, children, id }: { title: ReactNode; children?: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 px-4 py-20 md:py-28">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-8 md:flex-row">
        <span className="n-bar rotate-90 md:rotate-0" aria-hidden="true" />
        <div className="flex w-full flex-col items-center gap-y-6 text-center">
          <h2 className="n-h2 max-w-[18ch]">{title}</h2>
          {children && <div className="n-body max-w-[76vw] lg:max-w-[54vw]">{children}</div>}
        </div>
        <span className="n-bar rotate-90 md:rotate-0" aria-hidden="true" />
      </div>
    </section>
  );
}
