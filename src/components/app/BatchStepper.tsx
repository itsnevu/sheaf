"use client";

import { IconCheck } from "@/components/ui";

export const WIZARD_STEPS = [
  { id: "details", label: "Details" },
  { id: "upload", label: "Upload" },
  { id: "validate", label: "Validate" },
  { id: "routes", label: "Routes" },
  { id: "review", label: "Review" },
  { id: "approve", label: "Approve" },
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number]["id"];

/** Which step the batch has reached, derived from server state so refreshes never lose place. */
export function reachedStep(status: string, hasCsv: boolean, invalidCount: number, validCount: number): number {
  if (status === "APPROVED") return 5;
  if (status === "ROUTES_PREPARED") return 4;
  if (status === "VALIDATED") return 3;
  if (hasCsv && (invalidCount > 0 || validCount === 0)) return 2;
  if (hasCsv) return 2;
  return 1;
}

export default function BatchStepper({ current, reached, onSelect }: { current: number; reached: number; onSelect: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Batch preparation steps">
      {WIZARD_STEPS.map((s, i) => {
        const done = i < reached;
        const active = i === current;
        const enabled = i <= reached;
        return (
          <li key={s.id} className="flex items-center">
            <button
              type="button"
              disabled={!enabled}
              aria-current={active ? "step" : undefined}
              onClick={() => onSelect(i)}
              className={`flex items-center gap-2 rounded-pill px-3 py-1.5 text-[0.8125rem] font-medium transition-colors ${active ? "bg-ink text-on-ink" : done ? "text-ink hover:bg-ink/5" : enabled ? "text-ink-soft hover:bg-ink/5" : "text-ink-faint"}`}
            >
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[0.7rem] ${active ? "bg-on-ink/20" : done ? "bg-success text-white" : "bg-field text-ink-faint"}`} aria-hidden="true">
                {done && !active ? <IconCheck className="h-3 w-3" /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < WIZARD_STEPS.length - 1 && <span className="mx-0.5 h-px w-4 bg-line" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
  );
}
