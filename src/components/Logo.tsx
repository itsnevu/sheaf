import Link from "next/link";

/**
 * Sheaf mark: three upright sheets bound by one band. The front sheet is solid (full internal
 * visibility), the sheets behind it fade (what the outside sees). Original artwork, drawn in
 * code so it scales and inherits colour.
 */
export function Mark({ size = 28, className = "", inverted = false, accent = "#2dd4bf" }: { size?: number; className?: string; inverted?: boolean; accent?: string }) {
  const bg = inverted ? "#f7f6f2" : "#141518";
  const fg = inverted ? "#141518" : "#f7f6f2";
  const id = inverted ? "sheaf-fade-i" : "sheaf-fade";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fg} stopOpacity="0.9" />
          <stop offset="1" stopColor={fg} stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={bg} />
      <rect x="20" y="6" width="5" height="20" rx="1.2" fill={`url(#${id})`} />
      <rect x="13.5" y="6" width="5" height="20" rx="1.2" fill={`url(#${id})`} opacity="0.7" />
      <rect x="7" y="6" width="5" height="20" rx="1.2" fill={fg} />
      <rect x="5.5" y="14" width="21" height="4" rx="1.5" fill={accent} />
    </svg>
  );
}

export function Wordmark({ className = "", inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark inverted={inverted} />
      <span className="font-display font-semibold tracking-[-0.02em] text-[1.125rem] leading-none">Sheaf</span>
    </span>
  );
}

export function LogoLink({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link href={href} aria-label="Sheaf home" className="inline-flex items-center rounded-md">
      <Wordmark inverted={inverted} />
    </Link>
  );
}
