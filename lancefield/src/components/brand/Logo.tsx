import Link from "next/link";

/**
 * Lancefield mark: a pennant on a tilted lance. Drawn in the brand palette (moss pennant, gilt
 * inner stripe, ink lance) on a paper tile. `tone` swaps the palette for dark surfaces.
 */
export function Mark({ size = 28, tone = "light", className = "", animate = false }: { size?: number; tone?: "light" | "dark" | "mono"; className?: string; animate?: boolean }) {
  const tile = tone === "dark" ? "#16171A" : tone === "mono" ? "transparent" : "#F6F2E9";
  const lance = tone === "dark" ? "#F6F2E9" : "#16171A";
  const pennant = tone === "mono" ? "currentColor" : "#1F5F45";
  const stripe = tone === "mono" ? "transparent" : "#C79A2E";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      {tone !== "mono" && <rect width="32" height="32" rx="8" fill={tile} />}
      {tone === "light" && <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="none" stroke="#16171A" strokeOpacity="0.12" />}
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

/** Header/footer lockup. */
export function Lockup({ href = "/", size = 28, tone = "light", className = "", compact = false }: { href?: string; size?: number; tone?: "light" | "dark"; className?: string; compact?: boolean }) {
  return (
    <Link href={href} aria-label="Lancefield home" className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={size} tone={tone} />
      {!compact && <Wordmark className={tone === "dark" ? "text-paper" : "text-ink"} />}
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
