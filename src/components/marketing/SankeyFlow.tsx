"use client";

const FLOWS = [
  { from: "Sender", to: "RaqioVault", width: 100, color: "var(--sky)" },
  { from: "RaqioVault", to: "Recipient", width: 75, color: "var(--success)" },
  { from: "RaqioVault", to: "Fee recipient", width: 25, color: "var(--ice-50)" },
];

export default function SankeyFlow() {
  return (
    <div className="sankey-flow">
      <svg viewBox="0 0 600 200" fill="none" aria-label="Token flow: Sender deposits into RaqioVault, which vests to Recipient and routes fee to Fee recipient">
        {/* Nodes */}
        <rect x="20" y="60" width="16" height="80" rx="2" fill="var(--sky)" />
        <rect x="272" y="30" width="16" height="140" rx="2" fill="var(--ice)" />
        <rect x="524" y="40" width="16" height="80" rx="2" fill="var(--success)" />
        <rect x="524" y="140" width="16" height="30" rx="2" fill="var(--ice-50)" />

        {/* Flow: Sender -> RaqioVault */}
        <path d="M36 70 C150 70 160 40 272 40 L272 160 C160 160 150 130 36 130Z" fill="var(--sky)" opacity="0.15" />
        <path d="M36 70 C150 70 160 40 272 40" stroke="var(--sky)" strokeWidth="1" opacity="0.4" />
        <path d="M36 130 C150 130 160 160 272 160" stroke="var(--sky)" strokeWidth="1" opacity="0.4" />

        {/* Flow: RaqioVault -> Recipient (75%) */}
        <path d="M288 40 C400 40 410 50 524 50 L524 110 C410 110 400 130 288 130Z" fill="var(--success)" opacity="0.12" />
        <path d="M288 40 C400 40 410 50 524 50" stroke="var(--success)" strokeWidth="1" opacity="0.4" />
        <path d="M288 130 C400 130 410 110 524 110" stroke="var(--success)" strokeWidth="1" opacity="0.4" />

        {/* Flow: RaqioVault -> Fee recipient (25 bps) */}
        <path d="M288 140 C400 140 410 145 524 145 L524 165 C410 165 400 155 288 155Z" fill="var(--ice)" opacity="0.06" />
        <path d="M288 140 C400 140 410 145 524 145" stroke="var(--ice-50)" strokeWidth="1" opacity="0.3" />
        <path d="M288 155 C400 155 410 165 524 165" stroke="var(--ice-50)" strokeWidth="1" opacity="0.3" />

        {/* Labels */}
        <text x="28" y="52" textAnchor="middle" fill="var(--sky)" fontSize="10" fontFamily="var(--font-mono), monospace">SENDER</text>
        <text x="280" y="20" textAnchor="middle" fill="var(--ice)" fontSize="10" fontFamily="var(--font-mono), monospace">RAQIOVAULT</text>
        <text x="532" y="32" textAnchor="middle" fill="var(--success)" fontSize="10" fontFamily="var(--font-mono), monospace">RECIPIENT</text>
        <text x="532" y="185" textAnchor="middle" fill="var(--ice-50)" fontSize="9" fontFamily="var(--font-mono), monospace">FEE (25 BPS)</text>

        {/* Percentage labels on flows */}
        <text x="180" y="95" textAnchor="middle" fill="var(--sky)" fontSize="11" fontFamily="var(--font-mono), monospace" opacity="0.7">100%</text>
        <text x="420" y="80" textAnchor="middle" fill="var(--success)" fontSize="11" fontFamily="var(--font-mono), monospace" opacity="0.7">99.75%</text>
        <text x="420" y="152" textAnchor="middle" fill="var(--ice-50)" fontSize="9" fontFamily="var(--font-mono), monospace" opacity="0.5">0.25%</text>
      </svg>
    </div>
  );
}
