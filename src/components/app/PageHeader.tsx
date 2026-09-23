import type { ReactNode } from "react";
import Link from "next/link";

export default function PageHeader({ title, eyebrow, description, actions, back }: { title: ReactNode; eyebrow?: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-[0.8125rem] text-ink-faint hover:text-ink">
            ← {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="title-1 [overflow-wrap:anywhere]">{title}</h1>
        {description && <div className="mt-1.5 text-[0.9375rem] text-ink-soft">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </div>
  );
}
