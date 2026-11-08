import { defineChain, isAddress, zeroAddress } from "viem";
import { MAINNET_DEPLOYMENT } from "./deployment";

export const elysiumTestnet = defineChain({
  id: 99801,
  name: "Elysium Testnet",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_ELYSIUM_RPC_URL || "https://testnet-rpc.elysium.kinetiq.xyz"] },
  },
  blockExplorers: {
    default: { name: "Elysium Explorer", url: "https://elysium.kinetiq.xyz/testnet-explorer" },
  },
  testnet: true,
});

export const elysiumMainnet = defineChain({
  id: MAINNET_DEPLOYMENT.chainId,
  name: MAINNET_DEPLOYMENT.network,
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: { default: { http: [process.env.NEXT_PUBLIC_ELYSIUM_MAINNET_RPC_URL || MAINNET_DEPLOYMENT.rpcUrl] } },
  blockExplorers: {
    default: { name: "Elysium Explorer", url: process.env.NEXT_PUBLIC_ELYSIUM_MAINNET_EXPLORER_URL || MAINNET_DEPLOYMENT.explorerUrl },
  },
});

export const CONTRACTS = {
  raqioStream: (process.env.NEXT_PUBLIC_RAQIO_STREAM_ADDRESS ?? "0x") as `0x${string}`,
  feeRouter: (process.env.NEXT_PUBLIC_FEE_ROUTER_ADDRESS ?? "0x") as `0x${string}`,
  raqioVault: (process.env.NEXT_PUBLIC_RAQIO_VAULT_ADDRESS || MAINNET_DEPLOYMENT.contracts.RaqioVault) as `0x${string}`,
  raqioAirdrop: (process.env.NEXT_PUBLIC_RAQIO_AIRDROP_ADDRESS || MAINNET_DEPLOYMENT.contracts.RaqioAirdrop) as `0x${string}`,
  raqioScore: (process.env.NEXT_PUBLIC_RAQIO_SCORE_ADDRESS || MAINNET_DEPLOYMENT.contracts.RaqioScore) as `0x${string}`,
} as const;

export function isContractConfigured(value: string): value is `0x${string}` {
  return isAddress(value, { strict: false }) && value.toLowerCase() !== zeroAddress;
}
