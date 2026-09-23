"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** The sheet code of each desk page, matching the codes in the navigation. */
const CODES: Array<[string, string]> = [
  ["/app/batches/new", "APP_002.N"],
  ["/app/batches/", "APP_002.ID"],
  ["/app/batches", "APP_002"],
  ["/app/executions", "APP_003"],
  ["/app/payments", "APP_003.ID"],
  ["/app/reconciliation", "APP_004"],
  ["/app/activity", "APP_005"],
  ["/app/settings", "APP_006"],
  ["/app", "APP_001"],
];

export default function PageHeader({ title, eyebrow, description, actions, back }: { title: ReactNode; eyebrow?: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  const pathname = usePathname();
  const code = CODES.find(([p]) => pathname.startsWith(p))?.[1] ?? "APP_###";
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-[0.8125rem] text-ink-faint hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <p className="eyebrow mb-1.5">
          <span className="ph-code">{code}</span>
          {eyebrow && <span> · {eyebrow}</span>}
        </p>
        <h1 className="title-1 [overflow-wrap:anywhere]">{title}</h1>
        {description && <div className="mt-1.5 text-[0.9375rem] text-ink-soft">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div>}
    </div>
  );
}
