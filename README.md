# Raqio

Vault platform continuation: [implementation status](docs/platform-implementation-status.md). Includes token/LP/NFT locks, streamed airdrops, a public explorer and a bounded on-chain commitment score on Elysium Mainnet (chain 99901). Vault, Airdrop and Score are deployed; [addresses and transaction receipts](contracts/deployments/elysium-mainnet-99901.json). Ownership nominations remain pending acceptance. No independent audit has been established.

The private execution desk for Elysium. **Private externally. Transparent internally.**

A Raqio is one controlled operation made of legs, executed from one desk: prepare the legs, get a second pair of eyes, fund, execute leg by leg, reconcile, keep an append-only record. The wallet that owns the funds or the eligibility never appears as the destination on-chain.

Raqio never says "anonymous", "untraceable" or "unlinkable". Amounts, timing and the desk contract address stay public, and anyone comparing explorers can correlate them. Every page says what stays visible.

## The four operations

| Kind | What it does | Contract |
| --- | --- | --- |
| **CLAIM** · Private allocation claim | A launch publishes a Merkle root of allocations. The eligible wallet proves eligibility and designates a fresh recipient by EIP-712 signature; tokens go straight to the recipient. One claim per account, inside a claim window. | `PrivateClaim` |
| **ACCUMULATE** · Stealth accumulation | The treasury deposits USDG and commits a plan (a Merkle root over legs: recipient, token, amount, not-before). An operator reveals and executes one leg at a time. Unexecuted legs and the total stay hidden; executed payouts are public. | `StealthDesk` |
| **OTC** · Private OTC block | Maker deposits asset A, names a counterparty (or anyone), wants asset B, sets an expiry. The taker fills atomically in one transaction. Never touches a pool or an order book. Each side can receive into a fresh address. | `OtcEscrow` |
| **TREASURY** · Delegated treasury | Owner funds; an operator proposes (token, to, amount); an approver who is not the proposer approves; the operator executes. Daily spend cap per token. Four-eyes enforced on-chain. | `DelegatedTreasury` |

Tokens with transfer restrictions carry transfer restrictions (compliance checks on sender and receiver). A fresh, unverified address cannot hold them, so stock-token legs must go to verified addresses; USDG legs can go anywhere. The contracts surface a restricted transfer as a clean revert and never leave funds stuck.

## What is in this repository

- **The desk** (`src/`): a Next.js 14 app. Sign in (email or Ethereum wallet), create an operation, add legs by paste or CSV, validate, prepare routes (quoted through Relay when the funds come from another chain), four-eyes approval, fund, execute with retries and idempotency keys, reconcile, export, audit trail. Roles: Owner, Desk operator, Approver, Viewer.
- **The contracts** (`contracts/`): deployed RaqioVault, RaqioAirdrop and RaqioScore, plus the four legacy desk contracts above. The legacy contracts are outside this mainnet deployment.
- **The site** (`/`, `/docs`, `/security`, `/privacy`): four instrument pages (printer, reader, fiche viewer, index sheet). See `design.md`.

Demo mode (the default) simulates routing, funding and settlement with a deterministic mock provider and labels every record as simulated. Real mode quotes routes from Relay and signs with the connected wallet. The legacy Relay console does not yet call the four legacy desk contracts. Vault and airdrop pages submit wallet-signed calls to the deployed mainnet contracts independently of desk demo mode.

## Quick start

```bash
cp .env.example .env            # set SESSION_SECRET, WORKER_SECRET, Raqio_ENCRYPTION_KEY
npm install
npm run db:push && npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in as `desk@halden.example` / `Raqio-demo-2026` (also `owner@`, `approver@`, `viewer@`).

Contracts:

```bash
cd contracts
forge build
forge test -vv
```

## Mainnet contracts

| Contract | Address |
| --- | --- |
| RaqioVault | `0x7dA7CA57a86C977a9CfAf3826b257aA9C6aD1C77` |
| RaqioAirdrop | `0xCf32A62308ce25691CFcc129B52B8a6424462184` |
| RaqioScore | `0x4b5b48e5ffF7FeC9B9D1978966B2966ac5ab11C8` |

Network: Elysium Mainnet `99901`. RPC: `https://rpc-elysium.perpme.fun`. [Whitepaper](docs/whitepaper.md), web `/whitepaper`, and `/docs#contract-ref` describe the deployed contracts. `npm run docs:sync` refreshes public downloads.

## Documentation

- [Mainnet readiness audit](docs/mainnet-readiness-audit.md) (verified checks, repaired findings and remaining release work)

- [Architecture](docs/architecture.md)
- [Development guide](docs/development.md) (setup, env vars, leg CSV format, demo scenarios, real-mode requirements, tests)
- [Deployment](docs/deployment.md) (Docker image, PostgreSQL, secrets, worker topology)
- [Implementation status](docs/implementation-status.md) (what is verified, limitations, next steps)
- [Privacy threat model](docs/security/privacy-threat-model.md)
- [Contracts](contracts/README.md)
- [Design](design.md)
- Research: [Relay integration](docs/research/relay-integration-research.md), [EarnHop design](docs/research/earnhop-design-research.md)

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run check` (lint + typecheck + test) · `npm test` · `npm run test:e2e` · `npm run db:push` · `npm run db:seed` · `npm run db:harden` · `npm run db:encrypt` · `npm run db:provider -- postgresql` · `npm run db:studio`

## Also in this repository

- [lancefield/](lancefield/README.md): Lancefield, a separate Next.js app (an AI-agent contest ground with its own brand). It has its own `package.json`, database and tests; nothing in it depends on Raqio.
