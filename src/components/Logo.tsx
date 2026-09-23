import Link from "next/link";

/**
 * Sheaf mark: three upright sheets bound by one band. The front sheet is solid (full internal
 * visibility), the sheets behind it fade (what the outside sees). Drawn in code so it scales.
 * Palette follows the site: white ground, ink #1f1f1f, one red band. Square corners, no radius.
 */
export function Mark({ size = 28, className = "", inverted = false, accent = "#ff0000" }: { size?: number; className?: string; inverted?: boolean; accent?: string }) {
  const bg = inverted ? "#1f1f1f" : "#ffffff";
  const fg = inverted ? "#ffffff" : "#1f1f1f";
  const id = inverted ? "sheaf-fade-i" : "sheaf-fade";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fg} stopOpacity="0.85" />
          <stop offset="1" stopColor={fg} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" fill={bg} />
      <rect x="0.5" y="0.5" width="31" height="31" fill="none" stroke={fg} strokeWidth="1" />
      <rect x="20" y="6" width="5" height="20" fill={`url(#${id})`} />
      <rect x="13.5" y="6" width="5" height="20" fill={`url(#${id})`} opacity="0.7" />
      <rect x="7" y="6" width="5" height="20" fill={fg} />
      <rect x="5.5" y="14" width="21" height="4" fill={accent} />
    </svg>
  );
}

export function Wordmark({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark inverted={inverted} />
      <span className="font-mono text-[0.9375rem] uppercase tracking-[0.12em] leading-none">Sheaf</span>
    </span>
  );
}

export function LogoLink({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link href={href} aria-label="Sheaf home" className="inline-flex items-center rounded-none">
      <Wordmark inverted={inverted} />
    </Link>
  );
}
