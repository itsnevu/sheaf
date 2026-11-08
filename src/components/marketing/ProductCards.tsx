"use client";

import Link from "next/link";

const PRODUCTS = [
  {
    tag: "01 / LOCK",
    title: "TOKEN LOCK",
    desc: "Lock standard ERC-20 tokens until a fixed time. Public proof on-chain.",
    href: "/app/lock/tokens",
    icon: (
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="6" y="14" width="20" height="14" rx="2" />
        <path d="M10 14V10a6 6 0 0112 0v4" />
      </svg>
    ),
  },
  {
    tag: "02 / LP LOCK",
    title: "LP LOCK",
    desc: "Lock ERC-20 LP tokens or ERC-721 positions. Locking does not certify pool safety.",
    href: "/app/lock/lp",
    icon: (
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <circle cx="12" cy="16" r="8" />
        <circle cx="20" cy="16" r="8" />
      </svg>
    ),
  },
  {
    tag: "03 / VESTING",
    title: "VESTING STREAMS",
    desc: "Linear vesting with cliff periods and beneficiary claims from the vault.",
    href: "/app/lock/stream",
    icon: (
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 28L12 28L28 4" />
        <path d="M12 4V28" strokeDasharray="2 3" />
      </svg>
    ),
  },
  {
    tag: "04 / AIRDROP",
    title: "MERKLE AIRDROP",
    desc: "Distribute allocations by Merkle proof, with optional vesting after each claim.",
    href: "/app/airdrop",
    icon: (
      <svg viewBox="0 0 32 32" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M16 4L4 12L16 20L28 12Z" />
        <path d="M4 20L16 28L28 20" />
      </svg>
    ),
  },
];

export default function ProductCards() {
  return (
    <div className="product-cards-grid">
      {PRODUCTS.map(p => (
        <Link key={p.tag} href={p.href} className="product-card-item">
          <div className="product-card-icon">{p.icon}</div>
          <h3>{p.title}</h3>
          <p>{p.desc}</p>
          <span className="micro product-card-cta">OPEN -&gt;</span>
        </Link>
      ))}
    </div>
  );
}
