/** Server-side runtime configuration. Never import from client components. */
import { MAINNET_DEPLOYMENT } from "./contracts/deployment";

export type ExecutionMode = "demo" | "real";

export function executionMode(): ExecutionMode {
  return (process.env.RAQIO_MODE ?? process.env.SHEAF_MODE) === "real" ? "real" : "demo";
}

export const DEMO_BANNER = "Demo desk: legacy operation legs are simulated. Vault and airdrop wallet actions use mainnet assets.";

/** Desk accounting denomination; an actual ERC-20 address must be configured for real execution. Native gas is HYPE. */
export const SETTLEMENT_ASSET = { symbol: "USDG", decimals: 6 } as const;
export const ELYSIUM_CHAIN_ID = MAINNET_DEPLOYMENT.chainId;

export function relayConfig() {
  return {
    apiUrl: (process.env.RELAY_API_URL || "https://api.relay.link").replace(/\/$/, ""),
    apiKey: process.env.RELAY_API_KEY || undefined,
    referrer: process.env.RELAY_REFERRER || undefined,
  };
}

export function chainConfig() {
  return {
    originChainId: Number(process.env.RAQIO_ORIGIN_CHAIN_ID || process.env.SHEAF_ORIGIN_CHAIN_ID || ELYSIUM_CHAIN_ID),
    destinationChainId: Number(process.env.RAQIO_DESTINATION_CHAIN_ID || process.env.SHEAF_DESTINATION_CHAIN_ID || ELYSIUM_CHAIN_ID),
  };
}

/**
 * USDG must be configured separately on each network and checked against Relay support.
 * A missing ERC-20 address is rejected by real-mode routing, never treated as native gas.
 */
export const KNOWN_ASSETS: Record<number, Record<string, { address: string; decimals: number }>> = {
  99901: {
    USDG: { address: (process.env.RAQIO_USDG_ADDRESS_99901 || process.env.SHEAF_USDG_ADDRESS_99901 || "0x0000000000000000000000000000000000000000").toLowerCase(), decimals: 6 },
    HYPE: { address: "0x0000000000000000000000000000000000000000", decimals: 18 }, // raqio:real-data-ok native token
  },
  99801: {
    USDG: { address: (process.env.RAQIO_USDG_ADDRESS_99801 || process.env.SHEAF_USDG_ADDRESS_99801 || "0x0000000000000000000000000000000000000000").toLowerCase(), decimals: 6 },
    HYPE: { address: "0x0000000000000000000000000000000000000000", decimals: 18 }, // raqio:real-data-ok native token
  },
  8453: {
    USDC: { address: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6 },
    USDT: { address: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 }, // raqio:real-data-ok native token
  },
  42161: {
    USDC: { address: "0xaf88d065e77c8cc2239327c5edb3a432268e5831", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 }, // raqio:real-data-ok native token
  },
  1: {
    USDC: { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 }, // raqio:real-data-ok native token
  },
  10: {
    USDC: { address: "0x0b2c639c533813f4aa9d7837caf62653d097ff85", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 }, // raqio:real-data-ok native token
  },
  84532: {
    USDC: { address: "0x036cbd53842c5426634e7929541ec2318f3dcf7e", decimals: 6 },
    ETH: { address: "0x0000000000000000000000000000000000000000", decimals: 18 }, // raqio:real-data-ok native token
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
  99801: "Elysium Testnet",
  99901: "Elysium Mainnet",
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
  99801: "https://elysium.kinetiq.xyz/testnet-explorer",
  99901: "https://elysium.kinetiq.xyz/explorer",
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
