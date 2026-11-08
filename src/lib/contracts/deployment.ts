import deployment from "../../../contracts/deployments/elysium-mainnet-99901.json";

/** Public deployment facts. Never import Foundry cache files or wallet configuration here. */
export const MAINNET_DEPLOYMENT = deployment;

export const DEPLOYED_CONTRACTS = [
  { name: "RaqioVault", address: deployment.contracts.RaqioVault, transaction: deployment.transactions[0], block: deployment.deploymentBlocks.RaqioVault },
  { name: "RaqioAirdrop", address: deployment.contracts.RaqioAirdrop, transaction: deployment.transactions[1], block: deployment.deploymentBlocks.RaqioAirdrop },
  { name: "RaqioScore", address: deployment.contracts.RaqioScore, transaction: deployment.transactions[2], block: deployment.deploymentBlocks.RaqioScore },
] as const;
