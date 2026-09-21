"use client";

import { useEffect, useState } from "react";
import { fmtDate, plural } from "@/lib/format";

/** "closes in 5 days 3 hours" / "closes in 40 minutes" / "closed 2 days ago". */
export function describeDeadline(closesAt: Date, now: Date): { label: string; over: boolean } {
  const ms = closesAt.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  if (ms <= 0) {
    const word = d >= 1 ? plural(d, "day") : h >= 1 ? plural(h, "hour") : plural(Math.max(1, m), "minute");
    return { label: `closed ${word} ago`, over: true };
  }
  const parts = d >= 1 ? [plural(d, "day"), h ? plural(h, "hour") : ""] : h >= 1 ? [plural(h, "hour"), m ? plural(m, "minute") : ""] : [plural(Math.max(1, m), "minute")];
  return { label: `closes in ${parts.filter(Boolean).join(" ")}`, over: false };
}

/**
 * Deadline readout that re-renders every minute. `initialNow` comes from the server so the
 * first client render matches the HTML; after mount the clock takes over.
 */
export default function Countdown({ closesAt, initialNow, className = "" }: { closesAt: string; initialNow: string; className?: string }) {
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(closesAt);
  const { label, over } = describeDeadline(target, now);
  return (
    <span className={`inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`}>
      <svg className={`h-4 w-4 shrink-0 ${over ? "text-ink-faint" : "text-moss"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" strokeLinecap="round" />
      </svg>
      <time dateTime={target.toISOString()} className={over ? "text-ink-soft" : "font-semibold text-moss-deep"} suppressHydrationWarning>
        {label}
      </time>
      <span className="text-ink-faint">· {fmtDate(target, true)}</span>
    </span>
  );
}
