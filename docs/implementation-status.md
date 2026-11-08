# Implementation status

For the current deployed Vault, Airdrop and Score platform, see [platform status](platform-implementation-status.md) and [whitepaper](whitepaper.md). This document tracks the separate legacy desk and Relay integration; its limitations do not mean the mainnet vault contracts are undeployed.

Current vault/vesting platform status and verified checks: [8 November 2026 continuation](platform-implementation-status.md). The historical desk/Relay implementation below is separate from the new vault flows.

Last updated 23 September 2026 (pivot to the private execution desk for Elysium).

## What is real and what is simulated

| Layer | Status |
|---|---|
| Desk application (operations, legs, stages, roles, audit, reconciliation, exports) | Real. Every action is enforced on the server and recorded. |
| Demo mode | Simulates routing, funding and every leg with a deterministic mock provider. Nothing touches Elysium. Every record carries `mode: demo` and a simulated label. |
| Real mode | Quotes routes through Relay (`POST /quote/v2`) and polls `GET /intents/status/v3`; the desk wallet signs route steps in the browser. Quoting and polling were verified live on Base during development. **The legacy Relay signing loop has not been exercised on-chain on Elysium Mainnet or with USDG.** The separate Vault, Airdrop and Score deployment succeeded on chain 99901; see [deployment record](../contracts/deployments/elysium-mainnet-99901.json). |
| Desk contracts (`contracts/`: `PrivateClaim`, `StealthDesk`, `OtcEscrow`, `DelegatedTreasury`) | Exist as Foundry sources maintained separately. **The application does not call them.** The operation kind is stored, shown and exported, but a leg today is a plain provider route whose on-chain sender is the desk wallet (or a Relay solver on cross-chain routes). |

## Verified on this commit

| Command | Result |
|---|---|
| `npm run db:push` | OK; adds `PaymentBatch.kind` and `BatchRecipient.notBefore` |
| `npm run db:seed` | OK; Halden Desk with five operations |
| `npm run check` | lint, typecheck and vitest pass (see the run log in the change summary) |
| `npm run build` | OK; standalone output |
| `npm run test:e2e` | Playwright desktop + mobile pass |

## Feature status

| Area | Status |
|---|---|
| Site (printer, reader, fiche, index sheet instruments) | Complete; owned by the site work stream |
| Auth (sign-up creates desk + Owner, sign-in, sign-out, wallet sign-in, scrypt, hashed session tokens, 14-day cookie) | Complete; sign-in and sign-up rate limited per IP and per email |
| Roles (Owner, Desk operator, Approver, Viewer), server-side capability checks, desk isolation, viewer redaction, four-eyes | Complete; full matrix covered by tests |
| Operation kinds (CLAIM, ACCUMULATE, OTC, TREASURY): picker, storage, kind-aware leg table, export column, filter | Complete |
| Leg CSV `label,address,asset,amount,not_before,memo` (template, limits, worker parsing, aliases, per-leg errors, duplicates, preview, in-place correction, server re-validation) | Complete |
| Seven stages (Legs → Validate → Route → Approve → Fund → Execute → Reconcile) | Complete; covered end-to-end by Playwright |
| Not-before scheduling (a leg never runs before its time; jitter and deadline still apply) | Complete; integration test |
| Route preparation and review | Complete |
| Approval bound to the leg-set hash, invalidation, revocation | Complete |
| Funding (simulated in demo; wallet-attested balance in real) | Complete (real path untested on-chain) |
| Execution engine (DB job queue, conditional claims, idempotency keys, bounded retries, backoff, unknown-state guard, roll-up, "Executing leg n of m") | Complete; integration tests cover every outcome |
| Executions page, reconciliation records, exports with simulated flag, export/download audit | Complete |
| Encryption at rest (labels, memos, CSV originals; AES-256-GCM; key required in production; migration script for older rows) | Complete |
| Append-only audit trail (client extension + database triggers; audit rows survive leg/operation deletion) | Complete |
| Production configuration guard, security headers, generic 500s in production, constant-time worker secret | Complete |
| Relay adapter (quote v2, status v3, retryable classification) | Implemented; verified live on Base; not exercised on-chain; not verified for chain 99901 in the legacy Relay flow |
| Real-mode wallet console (injected wallets, WalletConnect when a project id is set, Elysium in the chain list, network switch, balance check, per-step signing) | Implemented; not exercised with a funded wallet |
| Docker image, compose stack with PostgreSQL, provider switch script, CI workflow | Complete; image build verified in CI configuration |
| Responsive layouts and accessibility basics | Complete; mobile viewport covered by the E2E smoke tests; no automated axe run |

## Known limitations

- The desk contracts are not called. `PrivateClaim`, `StealthDesk` (Merkle-committed plans), `OtcEscrow` and `DelegatedTreasury` (daily cap) have no on-chain effect from the app; the kind changes labels, validation hints and exports only.
- Restricted token transfer restrictions are described, not checked: the app cannot tell whether a destination is allowlisted. The demo seed shows the failure shape (`RESTRICTED_TOKEN: recipient not allowlisted (simulated)`).
- The USDG contract on Elysium is read from `RAQIO_USDG_ADDRESS_99901`; the placeholder in `KNOWN_ASSETS` only serves demo mode.
- One server-side encryption key for every desk; per-desk keys in a KMS are not implemented. Addresses and amounts are stored in clear because duplicate detection and search need them.
- The audit table is append-only inside the database but is not anchored to an external or immutable store.
- Free-text search scans up to 5,000 legs of the desk after decryption, then paginates.
- EVM addresses only; no ENS.
- Public Relay limit (50 quotes/min) bounds route preparation without an API key.
- The mock provider keeps simulated submissions in memory; a restart mid-execution leaves those attempts `UNKNOWN` by design.
- In-process worker is single-instance; use the HTTP trigger for multi-instance hosts.
- Same-chain, same-token routes make the desk wallet the visible sender of each leg (flagged in the UI).
- No email delivery: invited members receive a temporary password shown once to the inviter.

## Next steps

1. **Wire the contracts.** Route preparation should build the contract call for the operation kind (claim into a fresh recipient through `PrivateClaim`; commit a plan root and execute legs through `StealthDesk`; open and settle an `OtcEscrow`; propose and approve through `DelegatedTreasury`) and the wallet console should sign those calls instead of plain transfers. Until then a real-mode leg is a plain route.
2. **Verify Elysium in Relay.** Confirm chain 99901 and USDG in `GET /chains` and `POST /currencies/v2`; set `RAQIO_USDG_ADDRESS_99901`.
3. **Funded testnet run** of the real-mode signing loop (`SHEAF_MODE=real`, desk wallet set in Settings) before any mainnet operation.
4. Optional hardening: per-desk KMS keys, external audit anchoring, axe accessibility pass, a Restricted token allowlist check before approval.
