import Link from "next/link";

const LOCK_TYPES = [
  { href:"/app/lock/stream", title:"Vesting stream", desc:"Create a linear schedule with an optional cliff in RaqioVault.", icon:<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 20h5L21 4M8 4v16"/></svg> },
  {
    href: "/app/lock/tokens",
    title: "Token Lock",
    desc: "Lock ERC-20 tokens until a specific date. Ideal for team vesting, investor lockups, or proving long-term commitment.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    href: "/app/lock/lp",
    title: "LP Lock",
    desc: "Lock liquidity pool tokens to prove liquidity commitment. Supports any ERC-20 LP token from DEX pairs.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="12" r="6" />
        <circle cx="15" cy="12" r="6" />
      </svg>
    ),
  },
];

export default function LockChooserPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 className="title-1" style={{ marginBottom: 8 }}>Create a Lock</h1>
      <p className="lede" style={{ marginBottom: 32 }}>Choose what to lock, then configure the amount, beneficiary and schedule.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {LOCK_TYPES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="card"
            style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 20, textDecoration: "none", color: "inherit" }}
          >
            <span style={{ color: "var(--electric)", flexShrink: 0 }}>{t.icon}</span>
            <div>
              <strong style={{ fontSize: 16, display: "block", marginBottom: 4 }}>{t.title}</strong>
              <span style={{ color: "var(--fg-2)", fontSize: 14 }}>{t.desc}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
