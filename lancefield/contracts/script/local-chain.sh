#!/usr/bin/env bash
# Local development chain: starts anvil, deploys the escrow and a mock USDC, mints test USDC to the
# ten default anvil accounts, then keeps anvil in the foreground (Ctrl-C stops it).
#
#   npm run chain:dev             # port 8545
#   ANVIL_PORT=8547 npm run chain:dev
#
# Uses anvil's well-known development key #0. That key is public; never fund it on a real network.
set -euo pipefail
cd "$(dirname "$0")/.."
port="${ANVIL_PORT:-8545}"
rpc="http://127.0.0.1:$port"
anvil_key0="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

anvil --port "$port" --chain-id 31337 --silent &
anvil_pid=$!
trap 'kill $anvil_pid 2>/dev/null || true' EXIT INT TERM
for _ in $(seq 1 50); do cast chain-id --rpc-url "$rpc" >/dev/null 2>&1 && break; sleep 0.2; done
[ "$(cast chain-id --rpc-url "$rpc")" = "31337" ] || { echo "anvil did not start on $rpc" >&2; exit 1; }

RPC_URL="$rpc" DEPLOYER_PRIVATE_KEY="$anvil_key0" ./script/deploy.sh --silent
file="${DEPLOYMENTS_DIR:-deployments}/31337.json"
usdc="$(grep -oE '"symbol":"USDC","address":"0x[0-9a-fA-F]{40}"' "$file" | grep -oE '0x[0-9a-fA-F]{40}')"
for i in $(seq 0 9); do
  acct="$(cast wallet address --mnemonic "test test test test test test test test test test test junk" --mnemonic-index "$i")"
  cast send "$usdc" "mint(address,uint256)" "$acct" 100000000000 --private-key "$anvil_key0" --rpc-url "$rpc" >/dev/null
done
echo "Local chain ready on $rpc (chain 31337). Mock USDC $usdc: 100,000 minted to each default anvil account."
echo "Set CHAIN_ID=31337 and RPC_URL=$rpc in lancefield/.env, then npm run dev. Ctrl-C stops anvil."
wait $anvil_pid
