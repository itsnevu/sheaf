"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { CATEGORIES, PHASE_LABEL } from "@/lib/domain";
import { DEFAULT_FILTERS, KIND_OPTIONS as KINDS, PHASE_TABS, RESULTS_ID, SORT_OPTIONS as SORTS, buildQuery, isFiltered, tabId, type FilterState, type PhaseTab, type SortKey } from "./filters";

/** The filter bar on /briefs. Every control writes the URL; the server page re-renders the results. */
export default function BriefFilters({ filters, counts }: { filters: FilterState; counts: Record<PhaseTab, number> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const apply = (patch: Partial<FilterState>) => {
    const next: FilterState = { ...filters, ...patch };
    // A category belongs to one kind; drop it when the kind no longer matches.
    if (next.kind && next.category && CATEGORIES.find((c) => c.id === next.category)?.kind !== next.kind) next.category = "";
    startTransition(() => router.replace(`/briefs${buildQuery(next)}`, { scroll: false }));
  };

  // Debounced search: push the typed value to the URL 300 ms after the last keystroke.
  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed === filters.q) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      apply({ q: trimmed });
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Adopt the value in the URL when it changes from outside (back button, clear) and nothing is in flight.
  useEffect(() => {
    if (!pending && !timer.current && filters.q !== q.trim()) setQ(filters.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q, pending]);

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: PHASE_TABS.length - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = (keys[e.key] + PHASE_TABS.length) % PHASE_TABS.length;
    tabRefs.current[next]?.focus();
  };

  const flushSearch = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (q.trim() !== filters.q) apply({ q: q.trim() });
  };

  const active = isFiltered(filters);
  const categories = filters.kind ? CATEGORIES.filter((c) => c.kind === filters.kind) : CATEGORIES;

  return (
    <div className="flex flex-col gap-4" aria-busy={pending || undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Phase" className="-mb-px flex max-w-full gap-1 overflow-x-auto">
          {PHASE_TABS.map((tab, i) => {
            const selected = filters.phase === tab;
            return (
              <button
                key={tab}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={tabId(tab)}
                aria-selected={selected}
                aria-controls={RESULTS_ID}
                tabIndex={selected ? 0 : -1}
                onKeyDown={(e) => onTabKey(e, i)}
                onClick={() => apply({ phase: tab })}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors ${selected ? "border-ink font-semibold text-ink" : "border-transparent font-medium text-ink-soft hover:border-line-strong hover:text-ink"}`}
              >
                {tab === "all" ? "All" : PHASE_LABEL[tab]}
                <span className="t-num ml-1.5 text-xs text-ink-faint">{counts[tab]}</span>
              </button>
            );
          })}
        </div>
        <p role="status" className="min-h-[1.25rem] text-xs text-ink-faint">
          {pending ? "Updating…" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
        <div className="relative flex-1 md:min-w-[14rem]">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") flushSearch();
            }}
            placeholder="Search title, prompt or category"
            aria-label="Search briefs"
            autoComplete="off"
            maxLength={80}
            className="field pl-10"
          />
        </div>

        <div role="group" aria-label="Kind" className="inline-flex w-fit rounded-pill border border-line bg-white/70 p-0.5">
          {KINDS.map(([value, label]) => {
            const on = filters.kind === value;
            return (
              <button key={value || "all"} type="button" aria-pressed={on} onClick={() => apply({ kind: value })} className={`rounded-pill px-3.5 py-1.5 text-sm transition-colors ${on ? "bg-ink font-semibold text-paper" : "font-medium text-ink-soft hover:text-ink"}`}>
                {label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 md:flex">
          <select aria-label="Category" value={filters.category} onChange={(e) => apply({ category: e.target.value })} className="field md:w-auto">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <select aria-label="Sort" value={filters.sort} onChange={(e) => apply({ sort: e.target.value as SortKey })} className="field md:w-auto">
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {active && (
          <button
            type="button"
            className="btn btn-ghost btn-sm w-fit"
            onClick={() => {
              if (timer.current) clearTimeout(timer.current);
              timer.current = null;
              setQ("");
              apply(DEFAULT_FILTERS);
            }}
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
