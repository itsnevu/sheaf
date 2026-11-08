import Link from "next/link";

export function Mark({ size = 28, className = "" }: { size?: number; className?: string }) {
  const bg = "var(--navy)";
  const mint = "var(--ice)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="1" fill={bg} />
      {/* Fluid drip shape: a token flowing downward over time */}
      <path
        d="M16 5 C12.5 5 10 7.5 10 10.5 C10 13 11.5 14.5 11.5 17 C11.5 19.5 9.5 21 9.5 23.5 C9.5 26.5 12.5 28 16 28 C19.5 28 22.5 26.5 22.5 23.5 C22.5 21 20.5 19.5 20.5 17 C20.5 14.5 22 13 22 10.5 C22 7.5 19.5 5 16 5Z"
        fill={mint}
      />
      {/* Inner cutout for the streaming/flow feel */}
      <ellipse cx="16" cy="23" rx="3" ry="2.5" fill={bg} opacity="0.5" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark />
      <span className="font-sans text-[0.9375rem] font-medium tracking-[-0.02em] text-fg leading-none">Rheo</span>
    </span>
  );
}

export function LogoLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} aria-label="Rheo home" className="inline-flex items-center">
      <Wordmark />
    </Link>
  );
}
