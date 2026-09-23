"use client";

import { IconCheck } from "@/components/ui";

/** The seven stages of an operation. Indices are used by the operation page. */
export const WIZARD_STEPS = [
  { id: "legs", label: "Legs" },
  { id: "validate", label: "Validate" },
  { id: "route", label: "Route" },
  { id: "approve", label: "Approve" },
  { id: "fund", label: "Fund" },
  { id: "execute", label: "Execute" },
  { id: "reconcile", label: "Reconcile" },
] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number]["id"];
export const STEP = { legs: 0, validate: 1, route: 2, approve: 3, fund: 4, execute: 5, reconcile: 6 } as const;

/** Which stage the operation has reached, derived from server state so refreshes never lose place. */
export function reachedStep(status: string, hasCsv: boolean, invalidCount: number, validCount: number): number {
  switch (status) {
    case "COMPLETED":
      return STEP.reconcile;
    case "EXECUTING":
    case "PARTIALLY_FAILED":
    case "FAILED":
    case "FUNDED":
      return STEP.execute;
    case "APPROVED":
      return STEP.fund;
    case "ROUTES_PREPARED":
      return STEP.approve;
    case "VALIDATED":
      return STEP.route;
    default:
      if (hasCsv && (invalidCount > 0 || validCount === 0)) return STEP.validate;
      if (hasCsv) return STEP.validate;
      return STEP.legs;
  }
}

export default function BatchStepper({ current, reached, onSelect, interactiveUpTo = WIZARD_STEPS.length - 1 }: { current: number; reached: number; onSelect: (i: number) => void; interactiveUpTo?: number }) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1" aria-label="Operation stages">
      {WIZARD_STEPS.map((s, i) => {
        const done = i < reached;
        const active = i === current;
        const enabled = i <= reached && i <= interactiveUpTo;
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
