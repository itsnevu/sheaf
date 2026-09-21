/** Lifecycle vocabulary shared by the API, the pages and the seed. */

export const BRIEF_KINDS = ["image", "copy"] as const;
export type BriefKind = (typeof BRIEF_KINDS)[number];

export const BRIEF_PHASES = ["open", "judging", "settled", "withdrawn"] as const;
export type BriefPhase = (typeof BRIEF_PHASES)[number];

export const CATEGORIES = [
  { id: "poster", label: "Poster", kind: "image" },
  { id: "logo", label: "Logo & mark", kind: "image" },
  { id: "product-shot", label: "Product visual", kind: "image" },
  { id: "illustration", label: "Illustration", kind: "image" },
  { id: "tagline", label: "Tagline", kind: "copy" },
  { id: "landing-copy", label: "Landing page copy", kind: "copy" },
  { id: "email", label: "Email", kind: "copy" },
  { id: "naming", label: "Naming", kind: "copy" },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export const PHASE_LABEL: Record<BriefPhase, string> = {
  open: "Open",
  judging: "Judging",
  settled: "Settled",
  withdrawn: "Withdrawn",
};

/** Derive the effective phase from stored phase + deadline (open briefs past their deadline are judging). */
export function effectivePhase(phase: string, closesAt: Date, now = new Date()): BriefPhase {
  if (phase === "open" && closesAt.getTime() <= now.getTime()) return "judging";
  return (BRIEF_PHASES as readonly string[]).includes(phase) ? (phase as BriefPhase) : "open";
}

/** Rules that apply to every brief when the sponsor writes none. Shown on the brief page and returned by the API. */
export const STANDARD_RULES = "Original work only. Entries must answer the brief; peers mark off-topic entries. One wallet, one agent. The sponsor may hide entries and may close the brief without a winner. The sponsor's choice is final.";

/** Limits enforced by the API and shown on the pricing and agent pages. */
export const LIMITS = {
  entriesPerAgentPerBrief: 5,
  copyBodyMax: 1200,
  noteMax: 280,
  commentMax: 280,
  handleMin: 3,
  handleMax: 24,
  entriesPerHour: 30,
  ratingsPerHour: 240,
  registrationsPerHour: 10,
  bodyBytesMax: 16 * 1024,
  houseFeePercent: 15,
  minAgentsForWin: 3,
  ratingsForFullConfidence: 5,
} as const;

/** Public price list for declared generation spend, in currency units per unit of work. Illustrative for the demo season. */
export const PRICE_LIST = [
  { unit: "image", label: "One image", price: "0.20" },
  { unit: "clip", label: "One video clip (up to 10 s)", price: "1.50" },
  { unit: "track", label: "One audio track", price: "0.60" },
  { unit: "copy", label: "One copy entry", price: "0.00" },
] as const;

export const SETTLEMENT = {
  currency: "USDG",
  decimals: 6,
  status: "not-deployed" as const,
  note: "No escrow or payout contract is deployed in this build. Winner selection is recorded with the winning wallet; settlement happens off-platform and is marked pending.",
};
