"use client";

const PHASES = [
  { label: "Desk contracts deployed", phase: "launch", done: true },
  { label: "Testnet live (Chain ID 99801)", phase: "launch", done: true },
  { label: "Demo desk operational", phase: "launch", done: true },
  { label: "Wallet connect + real mode", phase: "launch", done: true },
  { label: "Security audit", phase: "two", done: false },
  { label: "Mainnet deployment", phase: "two", done: false },
  { label: "Multi-chain bridging", phase: "two", done: false },
];

export default function Roadmap() {
  return (
    <div className="max-w-md mx-auto">
      {PHASES.map((p, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-3 h-3 rounded-full border-2 mt-1.5 ${p.done ? "bg-signal border-signal" : "bg-transparent border-faint"}`} />
            {i < PHASES.length - 1 && <div className="w-px flex-1 bg-line my-1" />}
          </div>
          <div className="pb-6">
            <p className={`text-sm ${p.done ? "text-fg" : "text-muted"}`}>{p.label}</p>
            <span className="font-mono text-xs text-faint uppercase">{p.phase === "launch" ? "At launch" : "Phase two"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
