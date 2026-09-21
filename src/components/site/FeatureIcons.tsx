/** Line icons for the feature cards. Original artwork, pink accent on a dark disc. */

function Disc({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative flex h-[150px] w-[150px] items-center justify-center rounded-full border border-white/15 bg-[#0a0816]" aria-hidden="true">
      <span className="absolute inset-3 rounded-full bg-[radial-gradient(60%_60%_at_40%_35%,rgba(255,46,85,.35),rgba(104,82,253,.15)_60%,transparent)]" />
      <svg width="76" height="76" viewBox="0 0 48 48" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="relative">
        {children}
      </svg>
    </span>
  );
}

const ICONS: Record<string, React.ReactNode> = {
  csv: (
    <>
      <path d="M12 6h16l8 8v28H12z" />
      <path d="M28 6v8h8" />
      <path d="M17 22h14M17 28h14M17 34h9" stroke="#ff2e55" />
    </>
  ),
  check: (
    <>
      <rect x="8" y="8" width="32" height="32" rx="4" />
      <path d="M16 24l6 6 11-12" stroke="#ff2e55" strokeWidth="2.4" />
    </>
  ),
  route: (
    <>
      <circle cx="10" cy="38" r="4" />
      <circle cx="38" cy="10" r="4" stroke="#ff2e55" />
      <path d="M14 36c10-2 10-22 20-24" />
      <circle cx="24" cy="24" r="2.5" fill="#fff" />
    </>
  ),
  stamp: (
    <>
      <path d="M10 40h28" />
      <path d="M14 34h20v6H14z" />
      <path d="M18 34l4-14h4l4 14" />
      <circle cx="24" cy="12" r="5" stroke="#ff2e55" />
    </>
  ),
  monitor: (
    <>
      <rect x="6" y="10" width="36" height="24" rx="3" />
      <path d="M12 26l7-8 6 5 7-10 4 6" stroke="#ff2e55" />
      <path d="M18 40h12" />
    </>
  ),
  split: (
    <>
      <path d="M8 24h12" />
      <path d="M20 24l10-10h10" />
      <path d="M20 24l10 10h10" stroke="#ff2e55" />
      <circle cx="40" cy="14" r="2.5" fill="#fff" />
      <circle cx="40" cy="34" r="2.5" fill="#ff2e55" stroke="#ff2e55" />
    </>
  ),
  reconcile: (
    <>
      <path d="M6 30h36" />
      <path d="M24 12v18" />
      <path d="M12 30l-6 8h12zM36 30l-6 8h12z" />
      <circle cx="24" cy="10" r="3" stroke="#ff2e55" />
    </>
  ),
  audit: (
    <>
      <path d="M10 8h28v32H10z" />
      <path d="M16 16h16M16 22h16M16 28h10" />
      <circle cx="33" cy="33" r="6" stroke="#ff2e55" />
      <path d="M37 37l5 5" stroke="#ff2e55" />
    </>
  ),
};

export default function FeatureIcon({ name }: { name: keyof typeof ICONS }) {
  return <Disc>{ICONS[name]}</Disc>;
}
