/** Server-side runtime configuration. Never import from client components. */

export type ExecutionMode = "demo" | "real";

export function executionMode(): ExecutionMode {
  return process.env.SHEAF_MODE === "real" ? "real" : "demo";
}

export const DEMO_BANNER = "Demo environment — no real funds are being transferred.";

export function relayConfig() {
  return {
    apiUrl: (process.env.RELAY_API_URL || "https://api.relay.link").replace(/\/$/, ""),
    apiKey: process.env.RELAY_API_KEY || undefined,
    referrer: process.env.RELAY_REFERRER || undefined,
  };
}

export function chainConfig() {
  return {
    originChainId: Number(process.env.SHEAF_ORIGIN_CHAIN_ID || 8453),
    destinationChainId: Number(process.env.SHEAF_DESTINATION_CHAIN_ID || 8453),
  };
}

/** Known asset contracts per chain used for real-mode quotes (verified via Relay /currencies/v2). */
export const KNOWN_ASSETS: Record<number, Record<string, { address: string; decimals: number }>> = {
  8453: {
    USDC: { address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6 },
    USDT: { address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 },
  },
  42161: {
    USDC: { address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 },
  },
  1: {
    USDC: { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 },
  },
  10: {
    USDC: { address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 },
  },
  84532: {
    USDC: { address: "0x036cbd53842c5426634e7929541ec2318f3dcf7e", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 },
  },
};

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  10: "Optimism",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  84532: "Base Sepolia",
  11155111: "Sepolia",
  4663: "Robinhood Chain",
  5042: "Arc",
};

export const EXPLORERS: Record<number, string> = {
  1: "https://etherscan.io",
  10: "https://optimistic.etherscan.io",
  137: "https://polygonscan.com",
  8453: "https://basescan.org",
  42161: "https://arbiscan.io",
  84532: "https://sepolia.basescan.org",
  11155111: "https://sepolia.etherscan.io",
  4663: "https://robin.etherscan.io",
  5042: "https://explorer.arc.io",
};

export function chainName(id: number): string {
  return CHAIN_NAMES[id] ?? `Chain ${id}`;
}

export function txUrl(chainId: number, hash: string): string | null {
  const base = EXPLORERS[chainId];
  return base ? `${base}/tx/${hash}` : null;
}

export const JITTER_MAX_SECONDS = 1800;
