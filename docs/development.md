# Development guide

## Prerequisites

- Node.js 20 or newer (built and tested with Node 24)
- npm

## Setup

```bash
cd sheaf
cp .env.example .env            # set SESSION_SECRET, WORKER_SECRET and SHEAF_ENCRYPTION_KEY (openssl rand -hex 32)
npm install                     # runs prisma generate
npm run db:push                 # creates prisma/dev.db (SQLite) and installs the audit triggers
npm run db:seed                 # demo desk "Halden Desk" with operations at every stage
npm run dev                     # http://localhost:3000 (use -- -p 3100 if 3000 is taken)
```

Seeded accounts (password `sheaf-demo-2026`):

| Email | Role |
|---|---|
| owner@halden.example | Owner |
| desk@halden.example | Desk operator |
| approver@halden.example | Approver |
| viewer@halden.example | Viewer |

Seeded operations: a completed stealth accumulation (12 legs, not-before spread over three days), a partially failed stealth accumulation (one leg `RESTRICTED_TOKEN: recipient not allowlisted (simulated)`, one retry-eligible), an approved private allocation claim (5 legs), a draft private OTC block (1 leg) and an executing delegated treasury (4 legs). Everything is `mode: demo` and labelled simulated.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server with the in-process worker |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` (eslint, core-web-vitals) |
| `npm test` | vitest: unit tests plus database integration tests against `prisma/test.db` (created automatically) |
| `npm run test:e2e` | Playwright end-to-end suite against a production build (`npm run build` first; `npx playwright install chromium` once) |
| `npm run check` | lint + typecheck + test |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma helpers; `db:push` also runs `db:harden` |
| `npm run db:harden` | (Re)install the append-only triggers on `AuditEvent` |
| `npm run db:encrypt` | Encrypt personal data written before encryption was enabled |
| `npm run db:provider -- postgresql` | Switch the Prisma datasource to PostgreSQL (or back to `sqlite`) |
| `npm run start:standalone` | Run the standalone server (`node .next/standalone/server.js`), as the Docker image does |

## Environment variables

See `.env.example` for the full list with comments. Summary:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Prisma connection |
| `SESSION_SECRET` | — | Required; signs session token hashes. Production refuses placeholders or fewer than 32 characters |
| `SHEAF_ENCRYPTION_KEY` | — | 64 hex characters. Encrypts leg labels, memos and CSV originals at rest. Required in production; derived from `SESSION_SECRET` elsewhere. Back it up with the database |
| `SHEAF_RATE_LIMIT` | `on` | Sign-in/sign-up rate limiting; `off` only for automated tests |
| `SHEAF_MODE` | `demo` | `demo` or `real`; shown in the UI, recorded on every operation |
| `RELAY_API_URL` | `https://api.relay.link` | Use `https://api.testnets.relay.link` for testnets |
| `RELAY_API_KEY` | empty | Optional; raises rate limits; server-only |
| `RELAY_REFERRER` | empty | Optional label; requires the key |
| `SHEAF_ORIGIN_CHAIN_ID` / `SHEAF_DESTINATION_CHAIN_ID` | `4663` | Robinhood Chain on both sides; a different origin makes Relay route the funding into Robinhood Chain. Per-desk values live in Settings |
| `SHEAF_USDG_ADDRESS_4663` | empty | USDG contract on Robinhood Chain. Required for real mode; verify against Relay `/currencies/v2` |
| `NEXT_PUBLIC_RPC_URL_<chainId>` | empty | Browser RPC override for the wallet console (viem ships the public Robinhood Chain RPC) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | empty | Adds a WalletConnect connector (QR modal) next to injected wallets when set |
| `WORKER_MODE` | `in-process` | `off` on serverless hosts |
| `WORKER_SECRET` | — | Protects `POST /api/worker/run` |
| `WORKER_INTERVAL_MS` | `2000` | Poll interval of the in-process worker |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Absolute URLs in metadata |

No secret is ever read from a `NEXT_PUBLIC_` variable.

## Leg CSV format

```
label,address,asset,amount,not_before,memo
Tranche 1,0x1b3f…9f0a,USDG,1250.00,2026-10-01T09:00:00Z,fresh recipient A
```

- `label`, `address`, `amount` are required. `asset` defaults to the desk's settlement asset (USDG). `not_before` is an optional ISO 8601 datetime (a plain date means midnight UTC). `memo` is free text.
- Labels and memos are encrypted at rest and never sent on-chain. Addresses and amounts are stored in clear so duplicates can be detected.
- `GET /api/template` downloads the template; the validator (`src/lib/csv/validate.ts`) runs in a Web Worker for preview and again on the server.
- For an OTC block the single leg's label is the counterparty, the amount is the give side, and the memo carries the want asset/amount, the expiry and the receive-into address.

## Demo mode behaviour

The mock provider (`src/lib/providers/mock.ts`) is deterministic and never touches a network. Every route, funding record, attempt, transaction reference and export row is marked simulated, and the desk shows the banner "Demo desk — every leg is simulated; no funds move on Robinhood Chain."

Scenario triggers for testing failure handling (by leg address / amount):

| Trigger | Behaviour |
|---|---|
| address ends in `00` | permanent failure (`BLOCKED_WALLET`), not retryable |
| address ends in `ff` | first attempt fails (`SOLVER_CAPACITY_EXCEEDED`, retry eligible); retry succeeds |
| address ends in `ee` | route unavailable at quote time (`NO_QUOTES`) |
| amount exactly `0.13` | deposit refunded (`REFUND`) |
| anything else | success after roughly 6 seconds |

A leg with a `not_before` in the future stays `SCHEDULED` until that time; the worker runs its job then.

Simulated submissions are held in process memory; restarting the server while a demo operation is executing makes the worker report those attempts as `UNKNOWN` and stop, which is the intended behaviour for an ambiguous state (nothing is resent).

## Real mode requirements

1. Set `SHEAF_MODE=real`, `RELAY_API_URL` (mainnet or testnets), `SHEAF_USDG_ADDRESS_4663` and optionally `RELAY_API_KEY`.
2. In Settings, set the desk wallet address and the origin/destination network and asset. Assets known to the app are listed in `src/lib/config.ts` (`KNOWN_ASSETS`); add entries after checking `POST /currencies/v2` on Relay.
3. Prepare routes: the worker calls `POST /quote/v2` per leg with `EXACT_OUTPUT`, `refundTo` = desk wallet, `ttl` 600 s, at a pace that respects the public 50 requests/minute limit.
4. Funding: the wallet console reads the ERC-20 balance of the connected wallet, checks it equals the configured desk wallet and covers the requirement, and records it.
5. Execution: "Sign next leg" sends each route step (approve, then deposit or send) through the injected wallet; the server records the hash and polls `GET /intents/status/v3` until success, failure or refund.

Status of real mode: quoting and status polling were verified against the live public API during development on Base. **No on-chain transaction was executed, and nothing was verified against Robinhood Chain.** The desk contracts in `contracts/` are not called by the application; a real-mode leg today is a plain Relay route whose sender is the desk wallet (or a Relay solver on cross-chain routes). Wiring `PrivateClaim`, `StealthDesk`, `OtcEscrow` and `DelegatedTreasury` into route preparation and signing is the next step.

## Tests

```bash
npm test
```

Unit tests cover exact amount parsing/formatting and float traps; the leg CSV (quotes, CRLF, BOM, delimiters, the header, aliases, `not_before` parsing, every row error class, 10,000-leg performance and the row limit); state transitions; the full capability matrix and DTO redaction; address checks; field encryption; rate limiting; the production configuration guard; and every mock-provider scenario.

Database integration tests (`tests/db/`) run against a throwaway SQLite file and cover encryption at rest, the append-only audit rule at both layers, the operation lifecycle (kind, import with `not_before` and memo, correction, route preparation, four-eyes approval, invalidation, funding, `not_before` scheduling, execution guards, cancellation, desk isolation) and the worker (idempotent submission, retry, refund, permanent failure, unknown-state guard, job claiming, backoff and stale-lock release).

```bash
npm run build
npx playwright install chromium   # once
npm run test:e2e
```

The end-to-end suite starts a production server on port 3111 with its own seeded database and drives the browser through the public pages, sign-in, the desk navigation, viewer redaction and the complete demo operation (pick a kind → import with a bad leg → in-place correction → routes → approver approval in a second session → simulated funding → execution → completion → executions and reconciliation search → activity feed), on desktop and a mobile viewport.

## Deployment notes

See [deployment.md](deployment.md) for the Docker image, the compose stack with PostgreSQL, required secrets, the worker topology and the pre-launch checklist.
