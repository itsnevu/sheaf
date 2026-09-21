import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { PHASE_LABEL, type BriefPhase } from "@/lib/domain";

/* ───────────── Buttons ───────────── */
type Variant = "primary" | "moss" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function Button({ variant = "primary", size = "md", href, loading, className = "", children, ...rest }: { variant?: Variant; size?: Size; href?: string; loading?: boolean; className?: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = `btn btn-${variant} ${size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : ""} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} aria-disabled={rest.disabled || undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button type={rest.type ?? "button"} className={cls} disabled={rest.disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={`h-4 w-4 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────── Form fields ───────────── */
let fieldSeq = 0;
const nextId = (prefix: string) => `${prefix}-${++fieldSeq}`;

export function Input({ label, help, error, id, className = "", ...rest }: { label: string; help?: string; error?: string | null; id?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const fid = id ?? nextId("in");
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">
        {label}
        {rest.required && <span className="ml-1 text-clay">*</span>}
      </label>
      <input id={fid} className={`field ${error ? "field-error" : ""}`} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-err` : help ? `${fid}-help` : undefined} {...rest} />
      {error ? (
        <p id={`${fid}-err`} className="error-text" role="alert">
          {error}
        </p>
      ) : help ? (
        <p id={`${fid}-help`} className="help">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({ label, help, error, id, className = "", ...rest }: { label: string; help?: string; error?: string | null; id?: string; className?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fid = id ?? nextId("ta");
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">
        {label}
        {rest.required && <span className="ml-1 text-clay">*</span>}
      </label>
      <textarea id={fid} className={`field min-h-[120px] ${error ? "field-error" : ""}`} aria-invalid={!!error || undefined} aria-describedby={error ? `${fid}-err` : help ? `${fid}-help` : undefined} {...rest} />
      {error ? (
        <p id={`${fid}-err`} className="error-text" role="alert">
          {error}
        </p>
      ) : help ? (
        <p id={`${fid}-help`} className="help">
          {help}
        </p>
      ) : null}
    </div>
  );
}

export function Select({ label, help, error, id, className = "", children, ...rest }: { label: string; help?: string; error?: string | null; id?: string; className?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  const fid = id ?? nextId("sel");
  return (
    <div className={className}>
      <label htmlFor={fid} className="label">
        {label}
        {rest.required && <span className="ml-1 text-clay">*</span>}
      </label>
      <select id={fid} className={`field ${error ? "field-error" : ""}`} aria-invalid={!!error || undefined} {...rest}>
        {children}
      </select>
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : help ? (
        <p className="help">{help}</p>
      ) : null}
    </div>
  );
}

/* ───────────── Badges ───────────── */
export function PhaseBadge({ phase, className = "" }: { phase: BriefPhase | string; className?: string }) {
  const p = (phase in PHASE_LABEL ? phase : "open") as BriefPhase;
  return <span className={`badge badge-dot badge-${p} ${className}`}>{PHASE_LABEL[p]}</span>;
}

export function KindTag({ kind }: { kind: string }) {
  return (
    <span className="tag">
      {kind === "image" ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="m3 16 5-5 4 4 3-3 6 6" />
        </svg>
      ) : (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
      )}
      {kind}
    </span>
  );
}

export function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`badge badge-demo ${className}`} title="Seeded demo data: not a real brief, agent or prize">
      demo
    </span>
  );
}

/* ───────────── Layout helpers ───────────── */
export function Eyebrow({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`t-eyebrow ${className}`}>{children}</p>;
}

export function SectionHeading({ eyebrow, title, lead, align = "left", className = "" }: { eyebrow?: string; title: ReactNode; lead?: ReactNode; align?: "left" | "center"; className?: string }) {
  return (
    <div className={`${align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"} ${className}`}>
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h2 className="t-display-md text-ink">{title}</h2>
      {lead && <p className="t-lead mt-4">{lead}</p>}
    </div>
  );
}

export function EmptyState({ title, body, action, illustration }: { title: string; body?: ReactNode; action?: ReactNode; illustration?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {illustration}
      <h3 className="t-display-sm mt-4 text-ink">{title}</h3>
      {body && <p className="t-body mt-2 max-w-md">{body}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Callout({ tone = "neutral", title, children, className = "" }: { tone?: "neutral" | "moss" | "clay" | "gilt"; title?: string; children: ReactNode; className?: string }) {
  const tones = { neutral: "border-line bg-paper-2 text-ink-soft", moss: "border-moss/30 bg-moss-tint text-moss-ink", clay: "border-clay/30 bg-clay-tint text-clay-deep", gilt: "border-gilt/40 bg-gilt-tint text-gilt-deep" };
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${tones[tone]} ${className}`} role={tone === "clay" ? "alert" : undefined}>
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div>
      <p className="t-eyebrow">{label}</p>
      <p className="t-num mt-1 font-display text-3xl font-medium text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-faint">{hint}</p>}
    </div>
  );
}

export function Money({ units, currency, className = "" }: { units: string; currency: string; className?: string }) {
  const n = BigInt(units);
  const whole = n / 1_000_000n;
  const frac = (n % 1_000_000n).toString().padStart(6, "0").slice(0, 2).replace(/0+$/, "");
  return (
    <span className={`t-num ${className}`}>
      {whole.toLocaleString("en-US")}
      {frac ? `.${frac}` : ""} <span className="text-[0.75em] font-normal text-ink-faint">{currency}</span>
    </span>
  );
}
