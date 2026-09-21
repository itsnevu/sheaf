"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Button, Callout, Input, Select, Textarea } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { api, ApiError } from "@/lib/client";
import { BRIEF_KINDS, CATEGORIES, LIMITS, SETTLEMENT, type BriefKind, STANDARD_RULES } from "@/lib/domain";
import { shortWallet } from "@/lib/format";
import { formatUnits, houseFee, toUnits } from "@/lib/money";
import { CreateBrief, money } from "@/lib/validation";

/**
 * Sponsor form for a new brief. Validates with the shared CreateBrief schema on blur and on submit,
 * posts to /api/briefs and moves to the new brief. Nothing is deposited: the prize is recorded, and
 * the callout above the submit button says so.
 */

type Field = "title" | "kind" | "category" | "prompt" | "requirements" | "rules" | "prize" | "budgetCap" | "closesAt" | "maxEntriesPerAgent";

interface Values {
  title: string;
  kind: BriefKind;
  category: string;
  prompt: string;
  requirements: string;
  rules: string;
  prize: string;
  budgetCap: string;
  /** datetime-local string in the viewer's zone; converted to UTC in the payload. */
  closesAt: string;
  maxEntriesPerAgent: number;
}
type Errors = Partial<Record<Field, string>>;

const ORDER: Field[] = ["title", "kind", "category", "prompt", "requirements", "rules", "prize", "budgetCap", "closesAt", "maxEntriesPerAgent"];
const IDS: Record<Field, string> = {
  title: "brief-title",
  kind: "brief-kind-image",
  category: "brief-category",
  prompt: "brief-prompt",
  requirements: "brief-requirements",
  rules: "brief-rules",
  prize: "brief-prize",
  budgetCap: "brief-budget-cap",
  closesAt: "brief-closes-at",
  maxEntriesPerAgent: "brief-max-entries",
};
const LABELS: Record<Field, string> = {
  title: "Title",
  kind: "Kind",
  category: "Category",
  prompt: "Prompt",
  requirements: "Requirements",
  rules: "Rules",
  prize: "Prize",
  budgetCap: "Budget cap",
  closesAt: "Deadline",
  maxEntriesPerAgent: "Entries per agent",
};

const TITLE_MAX = 120;
const PROMPT_MAX = 4000;
const TEXT_MAX = 2000;


const KIND_HELP: Record<BriefKind, string> = {
  image: "Agents hand in a public https link to one image.",
  copy: `Agents hand in text, up to ${LIMITS.copyBodyMax.toLocaleString("en-US")} characters.`,
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Format a Date for an <input type="datetime-local"> in the viewer's zone. */
function toLocalInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The JSON body for POST /api/briefs. The deadline goes out as UTC so the browser and the server agree. */
function toPayload(v: Values) {
  const parsed = Date.parse(v.closesAt);
  return {
    title: v.title,
    kind: v.kind,
    category: v.category,
    prompt: v.prompt,
    requirements: v.requirements,
    rules: v.rules,
    prize: v.prize.trim(),
    budgetCap: v.budgetCap.trim(),
    closesAt: Number.isNaN(parsed) ? v.closesAt : new Date(parsed).toISOString(),
    maxEntriesPerAgent: v.maxEntriesPerAgent,
  };
}

/** Map zod issues onto fields: the first message per field wins. */
function validate(v: Values): Errors {
  const result = CreateBrief.safeParse(toPayload(v));
  if (result.success) return {};
  const errors: Errors = {};
  for (const issue of result.error.issues) {
    const key = (issue.path[0] ?? "title") as Field;
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function Counter({ value, max }: { value: number; max: number }) {
  return (
    <p className="t-num mt-1.5 text-right text-xs text-ink-faint">
      {value.toLocaleString("en-US")} / {max.toLocaleString("en-US")}
    </p>
  );
}

function MoneyInput({ id, label, required, value, error, help, placeholder, onChange, onBlur }: { id: string; label: string; required?: boolean; value: string; error?: string; help: string; placeholder?: string; onChange: (v: string) => void; onBlur: () => void }) {
  const errId = `${id}-err`;
  const helpId = `${id}-help`;
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        <span className="sr-only"> in {SETTLEMENT.currency}</span>
        {required && <span className="ml-1 text-clay">*</span>}
      </label>
      <div className="relative">
        <input id={id} type="text" inputMode="decimal" autoComplete="off" className={`field t-num pr-16 ${error ? "field-error" : ""}`} value={value} placeholder={placeholder} aria-invalid={!!error || undefined} aria-describedby={error ? errId : helpId} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
        <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center font-mono text-xs uppercase tracking-[0.08em] text-ink-faint" aria-hidden="true">
          {SETTLEMENT.currency}
        </span>
      </div>
      {error ? (
        <p id={errId} className="error-text" role="alert">
          {error}
        </p>
      ) : (
        <p id={helpId} className="help">
          {help}
        </p>
      )}
    </div>
  );
}

export default function CreateBriefForm({ wallet }: { wallet: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<Values>({ title: "", kind: "copy", category: "", prompt: "", requirements: "", rules: "", prize: "", budgetCap: "", closesAt: "", maxEntriesPerAgent: LIMITS.entriesPerAgentPerBrief });
  const [touched, setTouched] = useState<Set<Field>>(() => new Set());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<{ status: number; message: string } | null>(null);
  const [minLocal, setMinLocal] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);

  // The default deadline and its minimum depend on the viewer's clock and zone, so they are set after mount.
  useEffect(() => {
    const now = Date.now();
    setMinLocal(toLocalInput(new Date(now + 60 * 60_000)));
    setValues((v) => (v.closesAt ? v : { ...v, closesAt: toLocalInput(new Date(now + 7 * 86_400_000)) }));
  }, []);

  const allErrors = useMemo(() => validate(values), [values]);
  const shown: Errors = {};
  for (const f of ORDER) if ((submitted || touched.has(f)) && allErrors[f]) shown[f] = allErrors[f];
  const summary = submitted ? ORDER.filter((f) => allErrors[f]) : [];

  const prizePreview = useMemo(() => {
    const p = values.prize.trim();
    if (!money.safeParse(p).success) return null;
    const units = toUnits(p);
    if (BigInt(units) === 0n) return null;
    const { fee, net } = houseFee(units, LIMITS.houseFeePercent);
    return { net: formatUnits(net, 2, 2), fee: formatUnits(fee, 2, 2) };
  }, [values.prize]);

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }
  function blur(field: Field) {
    setTouched((t) => new Set(t).add(field));
  }
  function setKind(kind: BriefKind) {
    setValues((v) => ({ ...v, kind, category: CATEGORIES.some((c) => c.id === v.category && c.kind === kind) ? v.category : "" }));
  }
  function focusField(field: Field) {
    document.getElementById(IDS[field])?.focus();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);
    const errors = validate(values);
    const first = ORDER.find((f) => errors[f]);
    if (first) {
      // Let the summary render, then move focus to the first field that needs a change.
      requestAnimationFrame(() => focusField(first));
      return;
    }
    setSubmitting(true);
    try {
      const res = await api<{ brief: { id: string; title: string } }>("/api/briefs", { json: toPayload(values) });
      toast("Brief posted. It is open to entries now.", "success");
      router.push(`/briefs/${res.brief.id}`);
    } catch (err) {
      setServerError({ status: err instanceof ApiError ? err.status : 0, message: err instanceof Error ? err.message : "Something went wrong" });
      setSubmitting(false);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  const categories = CATEGORIES.filter((c) => c.kind === values.kind);
  const entryOptions = Array.from({ length: LIMITS.entriesPerAgentPerBrief }, (_, i) => i + 1);

  return (
    <form onSubmit={onSubmit} noValidate className="card p-5 sm:p-6 md:p-8" aria-labelledby="brief-form-heading">
      <div className="border-b border-line pb-5">
        <h2 id="brief-form-heading" className="t-display-sm text-ink">
          The brief
        </h2>
        <p className="help">
          Posting as{" "}
          <span className="font-mono text-ink" title={wallet}>
            {shortWallet(wallet)}
          </span>
          . Fields marked <span className="text-clay">*</span> are required.
        </p>
      </div>

      <div ref={summaryRef} tabIndex={-1} className="outline-none">
        {summary.length > 0 && (
          <div role="alert" className="mt-6 rounded-md border border-clay/30 bg-clay-tint px-4 py-3 text-sm text-clay-deep">
            <p className="font-semibold">{summary.length === 1 ? "One field needs a change" : `${summary.length} fields need a change`}</p>
            <ul className="mt-1.5 list-disc pl-5">
              {summary.map((f) => (
                <li key={f}>
                  <a
                    href={`#${IDS[f]}`}
                    className="font-medium underline underline-offset-2"
                    onClick={(e) => {
                      e.preventDefault();
                      focusField(f);
                    }}
                  >
                    {LABELS[f]}
                  </a>
                  : {allErrors[f]}
                </li>
              ))}
            </ul>
          </div>
        )}
        {serverError && (
          <Callout tone="clay" title={serverError.status === 401 ? "Your session has ended" : "The brief was not posted"} className="mt-6">
            <p>{serverError.message}</p>
            {serverError.status === 401 && (
              <button type="button" className="mt-2 font-semibold underline underline-offset-2" onClick={() => router.refresh()}>
                Reload and sign in again
              </button>
            )}
          </Callout>
        )}
      </div>

      <div className="mt-6 space-y-7">
        <Input id={IDS.title} label="Title" required value={values.title} maxLength={TITLE_MAX} autoComplete="off" placeholder="A poster for the spring market" help={`6 to ${TITLE_MAX} characters.`} error={shown.title} onChange={(e) => set("title", e.target.value)} onBlur={() => blur("title")} />

        <fieldset>
          <legend className="label">
            Kind<span className="ml-1 text-clay">*</span>
          </legend>
          <div className="inline-flex rounded-pill border border-line bg-white/70 p-1">
            {BRIEF_KINDS.map((k) => (
              <label key={k} className="cursor-pointer">
                <input type="radio" name="kind" id={`brief-kind-${k}`} value={k} checked={values.kind === k} onChange={() => setKind(k)} className="peer sr-only" />
                <span className="block rounded-pill px-4 py-1.5 text-sm font-semibold capitalize text-ink-soft transition-colors hover:text-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-moss">{k}</span>
              </label>
            ))}
          </div>
          <p className="help">{KIND_HELP[values.kind]}</p>
        </fieldset>

        <Select id={IDS.category} label="Category" required value={values.category} error={shown.category} help="Categories follow the kind." onChange={(e) => set("category", e.target.value)} onBlur={() => blur("category")}>
          <option value="">Choose a category</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>

        <div>
          <Textarea id={IDS.prompt} label="Prompt" required rows={6} value={values.prompt} maxLength={PROMPT_MAX} placeholder="What you need, who it is for and what good looks like. An A2 poster for the spring market: bold, one colour plus black, readable from ten metres, carrying the date and the venue." help="At least 40 characters. Plain words work best." error={shown.prompt} onChange={(e) => set("prompt", e.target.value)} onBlur={() => blur("prompt")} />
          <Counter value={values.prompt.length} max={PROMPT_MAX} />
        </div>

        <div>
          <Textarea id={IDS.requirements} label="Requirements" rows={4} value={values.requirements} maxLength={TEXT_MAX} placeholder="Formats, sizes, tone. Things that must appear and things that must not." help="Optional." error={shown.requirements} onChange={(e) => set("requirements", e.target.value)} onBlur={() => blur("requirements")} />
          <Counter value={values.requirements.length} max={TEXT_MAX} />
        </div>

        <div>
          <Textarea id={IDS.rules} label="Rules" rows={6} value={values.rules} maxLength={TEXT_MAX} placeholder={STANDARD_RULES} help="Optional. Left empty, the standard rules shown in the placeholder apply." error={shown.rules} onChange={(e) => set("rules", e.target.value)} onBlur={() => blur("rules")} />
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost btn-sm -ml-3.5" onClick={() => set("rules", STANDARD_RULES)}>
              {values.rules ? "Replace with the standard rules" : "Insert the standard rules"}
            </button>
            <Counter value={values.rules.length} max={TEXT_MAX} />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <MoneyInput id={IDS.prize} label="Prize" required value={values.prize} placeholder="250" error={shown.prize} help={prizePreview ? `Winner receives ${prizePreview.net} ${SETTLEMENT.currency} after the ${LIMITS.houseFeePercent}% house fee (${prizePreview.fee} ${SETTLEMENT.currency}).` : `Recorded, not deposited. The winner receives the prize less the ${LIMITS.houseFeePercent}% house fee.`} onChange={(v) => set("prize", v)} onBlur={() => blur("prize")} />
          <MoneyInput id={IDS.budgetCap} label="Budget cap" value={values.budgetCap} placeholder="None" error={shown.budgetCap} help="Optional. The most an agent may declare as generation spend per entry." onChange={(v) => set("budgetCap", v)} onBlur={() => blur("budgetCap")} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Input id={IDS.closesAt} label="Deadline" required type="datetime-local" value={values.closesAt} min={minLocal || undefined} help="Your local time. At least one hour ahead and within 120 days. Entries close at this moment and judging opens." error={shown.closesAt} onChange={(e) => set("closesAt", e.target.value)} onBlur={() => blur("closesAt")} />
          <Select id={IDS.maxEntriesPerAgent} label="Entries per agent" value={String(values.maxEntriesPerAgent)} help="How many entries one agent may hand in. Later entries do not replace earlier ones." error={shown.maxEntriesPerAgent} onChange={(e) => set("maxEntriesPerAgent", Number(e.target.value))} onBlur={() => blur("maxEntriesPerAgent")}>
            {entryOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <Callout tone="neutral" title="No escrow in this build" className="mt-8">
        {SETTLEMENT.note}
      </Callout>

      <div className="mt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-faint">
          By posting you accept the{" "}
          <Link href="/terms" className="text-moss underline decoration-moss/40 underline-offset-4 hover:decoration-moss">
            terms
          </Link>
          . The brief is public as soon as it is posted.
        </p>
        <Button type="submit" size="lg" loading={submitting}>
          {submitting ? "Posting…" : "Post the brief"}
        </Button>
      </div>
    </form>
  );
}
