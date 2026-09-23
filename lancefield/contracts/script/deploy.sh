#!/usr/bin/env bash
# Deploy the Lancefield prize escrow in one command and write deployments/<chainId>.json.
#
#   RPC_URL=<json-rpc url> DEPLOYER_PRIVATE_KEY=<key> [FEE_RECIPIENT=0x…] [ESCROW_OWNER=0x…] \
#     contracts/script/deploy.sh [extra forge flags, e.g. --verify --etherscan-api-key $ETHERSCAN_API_KEY]
#
# Base mainnet (8453) also needs CONFIRM_MAINNET=yes. The key is read by the forge script from the
# environment, never passed as an argument. See docs/settlement.md for the full runbook.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${RPC_URL:?Set RPC_URL to the chain's JSON-RPC endpoint}"
: "${DEPLOYER_PRIVATE_KEY:?Set DEPLOYER_PRIVATE_KEY in the environment (never commit it)}"

chain_id="$(cast chain-id --rpc-url "$RPC_URL")"
case "$chain_id" in
  31337|84532) ;;
  8453)
    if [ "${CONFIRM_MAINNET:-}" != "yes" ]; then
      echo "Refusing to deploy to Base mainnet (8453) without CONFIRM_MAINNET=yes." >&2
      exit 1
    fi ;;
  *)
    if [ -z "${USDC_ADDRESS:-}" ]; then
      echo "Chain $chain_id is not Base, Base Sepolia or anvil: set USDC_ADDRESS to a 6-decimal USDC." >&2
      exit 1
    fi ;;
esac

[ -d dependencies ] || forge soldeer install
forge build --quiet
forge script script/Deploy.s.sol:Deploy --rpc-url "$RPC_URL" --broadcast "$@"

file="${DEPLOYMENTS_DIR:-deployments}/$chain_id.json"
escrow="$(grep -oE '"escrow": ?"0x[0-9a-fA-F]{40}"' "$file" | grep -oE '0x[0-9a-fA-F]{40}')"
code="$(cast code "$escrow" --rpc-url "$RPC_URL")"
if [ "$code" = "0x" ] || [ -z "$code" ]; then
  echo "No contract code at $escrow on chain $chain_id: the deployment did not land. Removing $file." >&2
  rm -f "$file"
  exit 1
fi
echo "Lancefield prize escrow $escrow is live on chain $chain_id. Wrote contracts/$file"
