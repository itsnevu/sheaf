"use client";

import Link from "next/link";
import { forwardRef, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { statusLabel, statusTone, type StatusTone } from "@/lib/domain/states";
import { formatUnits } from "@/lib/money";
import { shortAddress } from "@/lib/address";
import { useToast } from "./Toast";

/* ───────────── Button ───────────── */
type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  href?: string;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "secondary", size = "md", loading, href, className = "", children, disabled, ...rest }, ref) {
  const cls = `btn btn-${variant} ${size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : ""} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} aria-disabled={disabled || undefined}>
        {children}
      </Link>
    );
  }
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
});

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────── Inputs ───────────── */
interface FieldProps {
  label?: string;
  help?: string;
  error?: string | null;
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(function Input({ label, help, error, id, className = "", ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <input ref={ref} id={inputId} className="input" aria-invalid={error ? "true" : undefined} aria-describedby={error ? `${inputId}-err` : help ? `${inputId}-help` : undefined} {...rest} />
      {error ? (
        <p id={`${inputId}-err`} className="error-text" role="alert">
          {error}
        </p>
      ) : help ? (
        <p id={`${inputId}-help`} className="help">
          {help}
        </p>
      ) : null}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps>(function Textarea({ label, help, error, id, className = "", ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <textarea ref={ref} id={inputId} className="input" aria-invalid={error ? "true" : undefined} {...rest} />
      {error ? <p className="error-text">{error}</p> : help ? <p className="help">{help}</p> : null}
    </div>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & FieldProps>(function Select({ label, help, error, id, className = "", children, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <select ref={ref} id={inputId} className="input" {...rest}>
        {children}
      </select>
      {error ? <p className="error-text">{error}</p> : help ? <p className="help">{help}</p> : null}
    </div>
  );
});

export function Switch({ checked, onChange, label, help, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string; disabled?: boolean }) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-pill transition-colors ${checked ? "bg-veil" : "bg-line-strong"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <span>
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        {help && <span className="block text-[0.8125rem] text-ink-faint">{help}</span>}
      </span>
    </label>
  );
}

/* ───────────── Status badge ───────────── */
export function StatusBadge({ status, tone, children, className = "", testId }: { status?: string | null; tone?: StatusTone; children?: ReactNode; className?: string; testId?: string }) {
  const t = tone ?? statusTone(status);
  const label = children ?? statusLabel(status);
  return (
    <span className={`badge badge-${t} ${className}`} data-testid={testId}>
      <span className="badge-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/* ───────────── Money / address ───────────── */
export function Money({ units, decimals, symbol, className = "" }: { units: string | bigint | null | undefined; decimals: number; symbol?: string; className?: string }) {
  if (units === null || units === undefined) return <span className={`text-ink-faint ${className}`}>—</span>;
  return (
    <span className={`tnum ${className}`}>
      {formatUnits(units, decimals)}
      {symbol && <span className="ml-1 text-ink-faint text-[0.85em]">{symbol}</span>}
    </span>
  );
}

export function CopyButton({ value, label = "Copy", className = "", size = "sm" }: { value: string; label?: string; className?: string; size?: "sm" | "xs" }) {
  const { toast } = useToast();
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      toast("Copied to clipboard");
      window.setTimeout(() => setDone(false), 1500);
    } catch {
      toast("Could not copy", { tone: "danger", detail: "Your browser blocked clipboard access." });
    }
  };
  return (
    <button type="button" onClick={copy} className={`inline-flex items-center justify-center rounded-md text-ink-faint hover:text-ink hover:bg-field transition-colors ${size === "xs" ? "h-6 w-6" : "h-7 w-7"} ${className}`} aria-label={`${label}: ${value}`} title={label}>
      {done ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
          <path d="M10.5 5.5v-2a1 1 0 0 0-1-1h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2" />
        </svg>
      )}
    </button>
  );
}

export function Address({ value, redacted, full = false, className = "" }: { value: string | null | undefined; redacted?: boolean; full?: boolean; className?: string }) {
  if (!value) return <span className="text-ink-faint">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}>
      <span className="mono-data" title={redacted ? "Address hidden for your role" : value}>
        {full ? value : shortAddress(value, 8, 6)}
      </span>
      {!redacted && <CopyButton value={value} label="Copy address" size="xs" />}
    </span>
  );
}

export function TxHash({ value, url, simulated }: { value: string | null | undefined; url?: string | null; simulated?: boolean }) {
  if (!value) return <span className="text-ink-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {url && !simulated ? (
        <a href={url} target="_blank" rel="noreferrer" className="mono-data link">
          {shortAddress(value, 10, 6)}
        </a>
      ) : (
        <span className="mono-data">{shortAddress(value, 10, 6)}</span>
      )}
      {simulated && <span className="badge badge-warning !py-0 !px-1.5 !text-[0.65rem]">simulated</span>}
      <CopyButton value={value} label="Copy reference" size="xs" />
    </span>
  );
}

/* ───────────── Layout bits ───────────── */
export function Card({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" }) {
  return <Tag className={`card ${className}`}>{children}</Tag>;
}

export function EmptyState({ title, detail, action, icon }: { title: string; detail?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-field text-ink-faint">{icon ?? <IconInbox />}</div>
      <h3 className="title-2">{title}</h3>
      {detail && <p className="mt-1.5 max-w-sm text-[0.9rem] text-ink-soft">{detail}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function Progress({ value, max, label, tone = "veil" }: { value: number; max: number; label?: string; tone?: "veil" | "ink" | "success" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const bar = tone === "success" ? "bg-success" : tone === "ink" ? "bg-ink" : "bg-veil";
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-[0.8125rem]">
          <span className="text-ink-soft">{label}</span>
          <span className="tnum text-ink-faint">
            {value}/{max}
          </span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-pill bg-field" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full ${bar} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, className = "" }: { tabs: Array<{ id: T; label: string; count?: number }>; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto border-b border-line ${className}`}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)} className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[0.875rem] font-medium transition-colors ${active ? "border-ink text-ink" : "border-transparent text-ink-faint hover:text-ink"}`}>
            {t.label}
            {t.count !== undefined && <span className={`ml-1.5 rounded-pill px-1.5 text-[0.7rem] ${active ? "bg-ink text-on-ink" : "bg-field text-ink-soft"}`}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Dialog ───────────── */
export function Dialog({ open, onClose, title, children, footer, size = "md" }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: "md" | "lg" }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [onClose]);
  return (
    <dialog ref={ref} className={`dialog ${size === "lg" ? "!w-[min(94vw,52rem)]" : ""}`} aria-labelledby={titleId} onClick={(e) => e.target === ref.current && onClose()}>
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id={titleId} className="title-2">
          {title}
        </h2>
        <button type="button" onClick={onClose} className="btn btn-ghost btn-sm -mr-2 !px-2" aria-label="Close">
          <IconX />
        </button>
      </div>
      <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
    </dialog>
  );
}

/* ───────────── Icons (inline, small) ───────────── */
export function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
export function IconInbox() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4 13l2-7h12l2 7v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5z" />
      <path d="M4 13h5l1 2h4l1-2h5" />
    </svg>
  );
}
export function IconArrow({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
export function IconCheck({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}
export function IconWarn({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 2.5l6 11H2l6-11z" />
      <path d="M8 6.5v3M8 11.5v.5" />
    </svg>
  );
}
