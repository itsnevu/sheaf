# Relay integration research

Verified 21 September 2026 against https://docs.relay.link and the live public API (`https://api.relay.link`). Nothing below is assumed from memory; each "verified" line names the source. Sample calls were made with a dead address as `user` and were never executed on-chain.

## 1. Verified capabilities

### Networks and assets
- `GET /chains` (no key) returned **60 chains**, all `depositEnabled: true`, including Base (8453), Arbitrum (42161), Optimism (10), Ethereum (1), Polygon (137), Arc (5042), Robinhood Chain (4663), Solana, Bitcoin, Tron and TON. Each chain object includes `httpRpcUrl`, `explorerUrl`, `erc20Currencies`, `vmType`, `disabled`, `partialDisableLimit`.
- `POST /currencies/v2` (`{"chainIds":[8453],"defaultList":true}`) returned USDC `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913` (6 decimals), USDT, ETH and others on Base.
- Testnets: `GET https://api.testnets.relay.link/chains` returned Base Sepolia (84532) and Sepolia (11155111).
- **Chosen defaults for Sheaf**: origin Base (8453) USDC → destination Base (8453) USDC, configurable via `SHEAF_ORIGIN_CHAIN_ID` / `SHEAF_DESTINATION_CHAIN_ID`. Both are in the live list.

### Quote
- `POST /quote/v2` (docs: references/api/get-quote-v2). Required body: `user`, `originChainId`, `destinationChainId`, `originCurrency`, `destinationCurrency`, `amount` (smallest unit, string), `tradeType` (`EXACT_INPUT` | `EXACT_OUTPUT` | `EXPECTED_OUTPUT`). Optional used by Sheaf: `recipient`, `refundTo`, `ttl`, `slippageTolerance`, `useDepositAddress`, `referrer` (needs key).
- Response: `requestId`, `steps[]` (`id` ∈ approve/deposit/authorize/swap/send, `kind` transaction|signature, `items[].data` = `{from,to,data,value,chainId,gas,maxFeePerGas,maxPriorityFeePerGas}`, `items[].check = {endpoint, method}`), `fees` (`gas`, `relayer`, `relayerGas`, `relayerService`, `app`, `subsidized`, each `{currency, amount, amountFormatted, amountUsd, minimumAmount}`), `details` (`currencyIn`, `currencyOut`, `timeEstimate`, `totalImpact`, `rate`, `slippageTolerance`, `route`, `userBalance`).
- **Live sample A** (same chain, Base USDC → Base USDC, 1.000000 USDC, `EXACT_INPUT`): one step `send` ("Send funds to the recipient"), `kind: transaction`, calldata is a plain ERC-20 `transfer(recipient, amount)` to the USDC contract. Fees: gas ≈ 0.0000457 ETH (≈ $0.12 at quote time), relayer/service 0.
- **Live sample B** (Arbitrum USDC → Base USDC, `EXACT_OUTPUT` 1.000000): two steps `approve` then `deposit`; fees: gas 0.0000017 ETH, relayer 0.047089 USDC (relayerGas 0.026988 + relayerService 0.020101), `timeEstimate: 2` seconds, `currencyIn: 1.047089`.
- `GET /intents/status/v3?requestId=` on a quoted-but-never-funded request returns `{"status":"waiting","quoteCreatedAt":…}` (verified).

### Status
- `GET /intents/status/v3?requestId=<id>`. Statuses (docs: get-intents-status-v3): `waiting`, `depositing`, `pending`, `submitted`, `success`, `delayed`, `refund`, `failure`. Fields: `status`, `details`, `inTxHashes[]`, `txHashes[]`, `updatedAt`, `originChainId`, `destinationChainId`, `quoteCreatedAt`, `failReason`, `refundFailReason`.
- `GET /requests/v2` lists requests with `user`, `recipient`, `status`, `inTxs`, `outTxs`, fees (verified live; it returns other integrators' requests too, see the privacy note below and the threat model).

### Fees (docs: how-it-works/fees)
- Components: execution cost (network gas + a "$0.02 flat fee — always included" + destination gas), swap cost (DEX fees + impact), platform fee (0.00 % for token bridges up to 0.15 % for swaps), optional app fee. Quoted values are estimates; actual values are computed at fill time.

### Failure and refunds
- Refunds "are paid on the origin chain to the `refundTo` address supplied on the quote"; if `refundTo` is absent, **automatic refunds are disabled** (docs: api_core_concepts/refunds). Relay refunds in the original currency where possible, minus gas.
- `failReason` codes are enumerated (docs: api_core_concepts/execution-errors). Retryable class per docs: `SOLVER_CAPACITY_EXCEEDED`, `SOLVER_BALANCE_TOO_LOW`, `NO_QUOTES`, `INSUFFICIENT_POOL_LIQUIDITY`, `SLIPPAGE`, `TRANSACTION_SUBMISSION_FAILED`, `CONTRACT_PAUSED`, `GENERATE_SWAP_FAILED`. Non-retryable: `BLOCKED_WALLET`, `DOUBLE_SPEND`, `TTL_EXPIRED`, `EXECUTION_REVERTED`, `TRANSFER_*`, `INVALID_*`, and most others. `TRANSACTION_NOT_INCLUDED` may still confirm: check the recorded hash before retrying.

### Authentication and rate limits (docs: api/api-keys, handling-rate-limits)
- No key required for quotes/status. Header `x-api-key`. A key is **required** only when `referrer` is set.
- Default per-key limits: `/quote` 50 req/min, `/requests` 200 req/min, `/transactions/status` 200 req/min, others 200 req/min. Elevated on request: `/quote` 10 req/s. On `429`, retry with exponential backoff.

### Wallet and signing (docs: relay-kit/sdk/actions/execute)
- Every step is either a `transaction` to be sent by the `user` address from a wallet, or a `signature` (permits). Relay does not custody funds before the deposit transaction, so **the treasury wallet must sign one transaction per route** (plus approvals). The SDK `@relayprotocol/relay-sdk` `execute({quote, wallet, onProgress})` accepts a viem `WalletClient`. Sheaf calls the HTTP API directly and signs with wagmi/viem in the browser, which is equivalent and avoids a large SDK bundle.

### Deposit addresses (docs: features/deposit-addresses)
- `useDepositAddress: true` returns a `depositAddress`; Relay sweeps funds received there. Open addresses can be reused for the same route; strict addresses are single-use. This is useful for custodial treasuries that cannot send calldata (exchange withdrawals). Not enabled by default in Sheaf.

## 2. Unsupported or unverified assumptions

| Assumption | Status |
|---|---|
| One quote can pay **many** recipients | **Unverified / not documented.** `/quote/v2` has one `recipient`. Smart-account docs describe batching calls after a bridge (ERC-4337 / EIP-7702), not multi-recipient payouts. Sheaf therefore quotes and executes **one route per recipient**. |
| Relay hides the treasury from the recipient | **False for same-chain, same-token routes**: the quoted step is a direct ERC-20 transfer from treasury to recipient. For cross-chain routes the destination fill comes from a Relay solver address, but the origin deposit and the `/requests` listing publicly link `user` and `recipient`. See the privacy threat model. |
| Fees are guaranteed | **Not guaranteed.** Quoted fees are estimates; fills compute actual fees. |
| Quotes stay valid | Quotes have a `ttl`; Relay may regenerate a quote on deposit. Sheaf re-quotes before funding and shows the age of every quote. |
| Webhooks | Mentioned in rate-limit guidance ("moving from polling to webhooks or websockets") but the webhook API was not verified. Sheaf polls `/intents/status/v3` with backoff. |
| Solana / Bitcoin / Tron recipients | Chains are listed, but address validation for non-EVM VMs is not implemented in Sheaf (EVM only, checksum-validated). |
| Robinhood Chain (4663) and Arc (5042) | Listed by `/chains`; no quote was sampled for them. |

## 3. Required credentials and configuration

| Variable | Purpose | Required |
|---|---|---|
| `SHEAF_MODE` | `demo` (mock provider) or `real` (Relay adapter) | yes |
| `RELAY_API_URL` | `https://api.relay.link` or `https://api.testnets.relay.link` | real mode |
| `RELAY_API_KEY` | Raises rate limits; needed with `RELAY_REFERRER` | optional |
| `SHEAF_ORIGIN_CHAIN_ID`, `SHEAF_DESTINATION_CHAIN_ID` | Route chains | real mode |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Mobile wallets | optional |
| `NEXT_PUBLIC_RPC_URL_<chainId>` | Browser RPC override | optional |

Secrets are read only on the server (`src/lib/providers/relay.ts`). No provider key is ever shipped to the browser.

## 4. Integration architecture

```
Browser (operator)                  Sheaf server                              Relay
──────────────────                  ──────────────                              ─────
Create batch / upload CSV  ──►  validate, store recipients (bigint base units)
Prepare routes             ──►  PaymentProvider.quote() per recipient  ──────►  POST /quote/v2
                           ◄──  route: requestId, steps, fees, expiresAt
Approve                    ──►  Approval record; hash of recipient set
Fund / execute (real)      ◄──  next unsigned step for route N (from,to,data,value,chainId)
wallet signs + broadcasts  ──►  POST attempt {routeId, stepId, txHash}
                                worker polls provider.status(requestId) ─────►  GET /intents/status/v3
                                ExecutionAttempt / PaymentRoute state machine
Reconcile / export         ◄──  records with inTxHashes/txHashes, fees, timestamps
```

- `PaymentProvider` interface (`src/lib/providers/types.ts`): `quote(input)`, `status(ref)`, `describe()`. Implementations: `MockProvider` (demo, deterministic simulation with explicit failure scenarios) and `RelayProvider` (HTTP API above). Business logic never imports Relay types.
- Execution is one job per route, processed by a DB-backed worker with row-level claims, idempotency keys (`batchId:recipientId:attemptNo`) and bounded retries. A route is never resubmitted while its last attempt is `pending`/`submitted` or while a status check errored (unknown state).

## 5. Known limitations

- Real execution requires a browser wallet holding the treasury funds; there is no server-side signer by design (no private keys on the server).
- Real mode has been verified only for quoting and status polling against the public API. **No on-chain transaction was executed** during this build (no funded wallet was available). The signing path is implemented but untested end-to-end.
- Same-chain, same-token payouts are plain transfers: Relay adds no routing and no privacy on that path. Sheaf surfaces this on the review screen.
- Rate limit of 50 quotes/min without a key caps route preparation at roughly 50 recipients per minute; Sheaf throttles and shows progress.
- Non-EVM destination chains are not supported by the CSV validator.

## 6. Remaining implementation requirements for production

1. Obtain a Relay API key and set a `referrer` for support and analytics.
2. Run a funded test on Base Sepolia (`RELAY_API_URL=https://api.testnets.relay.link`) through the full sign → poll → reconcile loop.
3. Add non-EVM address validation if Solana/Bitcoin recipients are needed.
4. Replace the in-process worker with a durable queue (e.g. a cron hitting `/api/worker/run`, or a dedicated worker process) for multi-instance deployments.
5. Decide whether to enable `useDepositAddress` for custodial treasuries.
