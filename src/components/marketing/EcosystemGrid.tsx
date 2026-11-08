"use client";

const ECOSYSTEM = [
  { name: "Elysium L2", role: "Settlement layer", desc: "Elysium Mainnet, chain 99901. Gas in HYPE.", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
  { name: "Raqio Contracts", role: "Vesting engine", desc: "RaqioVault, RaqioAirdrop and RaqioScore deployed on mainnet.", icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.17.71.556 1.38 1.14 1.946a3.42 3.42 0 010 4.438c-.584.566-.97 1.236-1.14 1.946a3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-1.14-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 001.14-1.946 3.42 3.42 0 013.138-3.138z" },
  { name: "Vault records", role: "Event indexing", desc: "Public locks and streams read directly from the vault through RPC.", icon: "M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M8 11h2M8 15h4" },
  { name: "Next.js API", role: "REST gateway", desc: "Desk operations, authenticated settings and public token search activity.", icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" },
  { name: "HYPE Token", role: "Gas currency", desc: "Native gas token for Elysium network transactions.", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { name: "Kinetiq Explorer", role: "Block explorer", desc: "Verify transactions, streams, and contract state on-chain.", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
];

export default function EcosystemGrid() {
  return (
    <div className="ecosystem-grid">
      {ECOSYSTEM.map((item) => (
        <article key={item.name} className="ecosystem-card">
          <div className="ecosystem-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d={item.icon} />
            </svg>
          </div>
          <div>
            <h3>{item.name}</h3>
            <span className="micro">{item.role}</span>
            <p>{item.desc}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
