# Sheaf

The private execution desk for Robinhood Chain. **Private externally. Transparent internally.**

A sheaf is one controlled operation made of legs, executed from one desk: prepare the legs, get a second pair of eyes, fund, execute leg by leg, reconcile, keep an append-only record. The wallet that owns the funds or the eligibility never appears as the destination on-chain.

Sheaf never says "anonymous", "untraceable" or "unlinkable". Amounts, timing and the desk contract address stay public, and anyone comparing explorers can correlate them. Every page says what stays visible.

## The four operations

| Kind | What it does | Contract |
| --- | --- | --- |
| **CLAIM** · Private allocation claim | A launch publishes a Merkle root of allocations. The eligible wallet proves eligibility and designates a fresh recipient by EIP-712 signature; tokens go straight to the recipient. One claim per account, inside a claim window. | `PrivateClaim` |
| **ACCUMULATE** · Stealth accumulation | The treasury deposits USDG and commits a plan (a Merkle root over legs: recipient, token, amount, not-before). An operator reveals and executes one leg at a time. Unexecuted legs and the total stay hidden; executed payouts are public. | `StealthDesk` |
| **OTC** · Private OTC block | Maker deposits asset A, names a counterparty (or anyone), wants asset B, sets an expiry. The taker fills atomically in one transaction. Never touches a pool or an order book. Each side can receive into a fresh address. | `OtcEscrow` |
| **TREASURY** · Delegated treasury | Owner funds; an operator proposes (token, to, amount); an approver who is not the proposer approves; the operator executes. Daily spend cap per token. Four-eyes enforced on-chain. | `DelegatedTreasury` |

Robinhood Stock Tokens carry transfer restrictions (compliance checks on sender and receiver). A fresh, unverified address cannot hold them, so stock-token legs must go to verified addresses; USDG legs can go anywhere. The contracts surface a restricted transfer as a clean revert and never leave funds stuck.

## What is in this repository

- **The desk** (`src/`): a Next.js 14 app. Sign in (email or Ethereum wallet), create an operation, add legs by paste or CSV, validate, prepare routes (quoted through Relay when the funds come from another chain), four-eyes approval, fund, execute with retries and idempotency keys, reconcile, export, audit trail. Roles: Owner, Desk operator, Approver, Viewer.
- **The contracts** (`contracts/`): the four Solidity contracts above, Foundry tests, a deploy script and their own README.
- **The site** (`/`, `/docs`, `/security`, `/privacy`): four instrument pages (printer, reader, fiche viewer, index sheet). See `design.md`.

Demo mode (the default) simulates routing, funding and settlement with a deterministic mock provider and labels every record as simulated. Real mode quotes routes from Relay and signs with the connected wallet. The desk does not yet submit transactions to the contracts on-chain; that wiring is the next step and is listed as such in `docs/implementation-status.md`.

## Quick start

```bash
cp .env.example .env            # set SESSION_SECRET, WORKER_SECRET, SHEAF_ENCRYPTION_KEY
npm install
npm run db:push && npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in as `desk@halden.example` / `sheaf-demo-2026` (also `owner@`, `approver@`, `viewer@`).

Contracts:

```bash
cd contracts
forge build
forge test -vv
```

## Documentation

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

- [lancefield/](lancefield/README.md): Lancefield, a separate Next.js app (an AI-agent contest ground with its own brand). It has its own `package.json`, database and tests; nothing in it depends on Sheaf.
