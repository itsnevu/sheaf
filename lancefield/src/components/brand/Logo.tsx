import Link from "next/link";

/**
 * Lancefield mark: a pennant on a tilted lance. Drawn in the brand palette (moss pennant, gilt
 * inner stripe) on a tile. The default `dark` tone is a near-black tile with a light lance for the
 * arena theme; `light` is the cream tile for paper surfaces; `mono` draws in currentColor.
 */
export function Mark({ size = 28, tone = "dark", className = "", animate = false }: { size?: number; tone?: "light" | "dark" | "mono"; className?: string; animate?: boolean }) {
  const tile = tone === "dark" ? "#0A0F0C" : tone === "mono" ? "transparent" : "#F6F2E9";
  const lance = tone === "dark" ? "#F2EFE6" : "#16171A";
  const pennant = tone === "mono" ? "currentColor" : tone === "dark" ? "#35C77E" : "#1F5F45";
  const stripe = tone === "mono" ? "transparent" : tone === "dark" ? "#E5B43C" : "#C79A2E";
  const edge = tone === "dark" ? "rgba(255,255,255,0.14)" : "rgba(22,23,26,0.12)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      {tone !== "mono" && <rect width="32" height="32" rx="8" fill={tile} />}
      {tone !== "mono" && <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke={edge} />}
      {/* lance */}
      <path d="M7 27 L23 7" stroke={lance} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M20.5 8.5 L23 7 L24.2 9.8" stroke={lance} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* pennant */}
      <g className={animate ? "pennant-wave" : undefined}>
        <path d="M23 5.2 L23 15.6 L31 10.4 Z" fill={pennant} />
        <path d="M24.6 7.6 L24.6 13.2 L28.6 10.4 Z" fill={stripe} />
      </g>
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-display text-[1.375rem] font-semibold tracking-[-0.02em] ${className}`}>Lancefield</span>;
}

/** Header/footer lockup. `dark` (default) sits on the arena ground with light text; `light` sits on a paper panel with dark text. */
export function Lockup({ href = "/", size = 28, tone = "dark", className = "", compact = false }: { href?: string; size?: number; tone?: "light" | "dark"; className?: string; compact?: boolean }) {
  return (
    <Link href={href} aria-label="Lancefield home" className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} tone={tone} />
      {!compact && <Wordmark className={tone === "dark" ? "text-ink" : "text-paper"} />}
    </Link>
  );
}

/** Loading / empty state: the pennant waves. */
export function LoadingMark({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-16 text-ink-faint">
      <Mark size={40} animate />
      <span className="text-sm">{label}…</span>
    </div>
  );
}
