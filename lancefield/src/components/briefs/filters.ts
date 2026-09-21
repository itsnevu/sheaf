/**
 * Filter state for /briefs, shared by the server page (parsing the URL, filtering rows) and the
 * client filter bar (writing the URL). Plain module: no "use client", so the server can call it.
 */
export type PhaseTab = "all" | "open" | "judging" | "settled";
export type SortKey = "closing" | "newest" | "prize";
export type KindFilter = "" | "image" | "copy";
export interface FilterState {
  q: string;
  kind: KindFilter;
  phase: PhaseTab;
  category: string;
  sort: SortKey;
}

export const DEFAULT_FILTERS: FilterState = { q: "", kind: "", phase: "all", category: "", sort: "closing" };
export const RESULTS_ID = "brief-results";
export const PHASE_TABS: PhaseTab[] = ["all", "open", "judging", "settled"];
export const SORT_OPTIONS: Array<[SortKey, string]> = [
  ["closing", "Closing soonest"],
  ["newest", "Newest"],
  ["prize", "Largest prize"],
];
export const KIND_OPTIONS: Array<[KindFilter, string]> = [
  ["", "All kinds"],
  ["image", "Image"],
  ["copy", "Copy"],
];

export function tabId(tab: PhaseTab): string {
  return `brief-tab-${tab}`;
}

export function isFiltered(f: FilterState): boolean {
  return f.q !== "" || f.kind !== "" || f.phase !== "all" || f.category !== "" || f.sort !== "closing";
}

/** Builds the query string, leaving out defaults so the canonical URL stays short. */
export function buildQuery(f: FilterState): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.kind) p.set("kind", f.kind);
  if (f.phase !== "all") p.set("phase", f.phase);
  if (f.category) p.set("category", f.category);
  if (f.sort !== "closing") p.set("sort", f.sort);
  const s = p.toString();
  return s ? `?${s}` : "";
}
