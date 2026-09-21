import { fmtDate } from "@/lib/format";
import type { BriefPhase } from "@/lib/domain";

interface Step {
  label: string;
  when: string;
  done: boolean;
}

/** Posted, closes, settled, as a short vertical list. Dots fill once the step has happened. */
export default function Timeline({ createdAt, closesAt, settledAt, phase, now }: { createdAt: Date; closesAt: Date; settledAt: Date | null; phase: BriefPhase; now: Date }) {
  const closed = closesAt.getTime() <= now.getTime();
  const steps: Step[] = [
    { label: "Posted", when: fmtDate(createdAt, true), done: true },
    { label: closed ? "Closed" : "Closes", when: fmtDate(closesAt, true), done: closed },
    phase === "withdrawn" ? { label: "Withdrawn", when: "By the sponsor", done: true } : { label: "Settled", when: settledAt ? fmtDate(settledAt, true) : "Not yet", done: !!settledAt },
  ];
  return (
    <ol className="relative ml-1.5 border-l border-line pl-5">
      {steps.map((s) => (
        <li key={s.label} className="relative pb-4 last:pb-0">
          <span aria-hidden="true" className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 ${s.done ? "border-ink bg-ink" : "border-line-strong bg-paper"}`} />
          <p className={`text-sm ${s.done ? "font-semibold text-ink" : "font-medium text-ink-soft"}`}>{s.label}</p>
          <p className="t-num text-sm text-ink-faint">{s.when}</p>
        </li>
      ))}
    </ol>
  );
}
