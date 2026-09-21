# Development guide

## Prerequisites

- Node.js 20 or newer (built and tested with Node 24)
- npm

## Setup

```bash
cd sheaf
cp .env.example .env            # edit SESSION_SECRET and WORKER_SECRET
npm install                     # runs prisma generate
npm run db:push                 # creates prisma/dev.db (SQLite)
npm run db:seed                 # demo organisation "Northwind Labs" with batches at every stage
npm run dev                     # http://localhost:3000 (use -- -p 3100 if 3000 is taken)
```

Seeded accounts (password `sheaf-demo-2026`):

| Email | Role |
|---|---|
| owner@northwind.example | Owner |
| finance@northwind.example | Finance admin |
| approver@northwind.example | Approver |
| viewer@northwind.example | Viewer |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Next.js dev server with the in-process worker |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` (eslint, core-web-vitals) |
| `npm test` | vitest unit tests (money, CSV parser/validator, states, permissions, addresses) |
| `npm run db:push` / `db:seed` / `db:studio` | Prisma helpers |

## Environment variables

See `.env.example` for the full list with comments. Summary:

| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Prisma connection |
| `SESSION_SECRET` | — | Required; signs session token hashes |
| `SHEAF_MODE` | `demo` | `demo` or `real`; shown in the UI, recorded on every batch |
| `RELAY_API_URL` | `https://api.relay.link` | Use `https://api.testnets.relay.link` for testnets |
| `RELAY_API_KEY` | empty | Optional; raises rate limits; server-only |
| `RELAY_REFERRER` | empty | Optional label; requires the key |
| `SHEAF_ORIGIN_CHAIN_ID` / `SHEAF_DESTINATION_CHAIN_ID` | `8453` | Defaults for new organisations; per-org values live in Settings |
| `NEXT_PUBLIC_RPC_URL_<chainId>` | empty | Browser RPC override for the wallet console |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | empty | Not wired yet; injected wallets only |
| `WORKER_MODE` | `in-process` | `off` on serverless hosts |
| `WORKER_SECRET` | — | Protects `POST /api/worker/run` |
| `WORKER_INTERVAL_MS` | `2000` | Poll interval of the in-process worker |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Absolute URLs in metadata |

No secret is ever read from a `NEXT_PUBLIC_` variable.

## Demo mode behaviour

The mock provider (`src/lib/providers/mock.ts`) is deterministic and never touches a network. Every route, funding record, attempt, transaction reference and export row is marked simulated, and the UI shows the banner "Demo environment — no real funds are being transferred."

Scenario triggers for testing failure handling (by recipient address / amount):

| Trigger | Behaviour |
|---|---|
| address ends in `00` | permanent failure (`BLOCKED_WALLET`), not retryable |
| address ends in `ff` | first attempt fails (`SOLVER_CAPACITY_EXCEEDED`, retry eligible); retry succeeds |
| address ends in `ee` | route unavailable at quote time (`NO_QUOTES`) |
| amount exactly `0.13` | deposit refunded (`REFUND`) |
| anything else | success after roughly 6 seconds |

Simulated submissions are held in process memory; restarting the server while a demo batch is executing makes the worker report those attempts as `UNKNOWN` and stop, which is the intended behaviour for an ambiguous state (nothing is resent).

## Real mode requirements

1. Set `SHEAF_MODE=real`, `RELAY_API_URL` (mainnet or testnets) and optionally `RELAY_API_KEY`.
2. In Settings, set the treasury wallet address and the origin/destination network and asset. Assets known to the app are listed in `src/lib/config.ts` (`KNOWN_ASSETS`); add entries after checking `POST /currencies/v2` on Relay.
3. Prepare routes: the worker calls `POST /quote/v2` per recipient with `EXACT_OUTPUT`, `refundTo` = treasury, `ttl` 600 s, at a pace that respects the public 50 requests/minute limit.
4. Funding: the wallet console reads the ERC-20 balance of the connected wallet, checks it equals the configured treasury and covers the requirement, and records it.
5. Execution: "Sign next payment" sends each route step (approve, then deposit or send) through the injected wallet; the server records the hash and polls `GET /intents/status/v3` until success, failure or refund.

Status of real mode: quoting and status polling were verified against the live public API during development. **No on-chain transaction was executed**; test on Base Sepolia with a funded wallet before any production use.

## Tests

```bash
npm test
```

Covers: exact amount parsing/formatting and float traps; CSV parsing (quotes, CRLF, BOM, delimiters), header aliases, every row error class, 10,000-row performance and the row limit; state transitions; the permission matrix; address checks.

End-to-end verification of the batch workflow (create → CSV rejections → import with scripted rows → correct/remove → prepare routes → route-unavailable handling → four-eyes approval → approval invalidation on edit → fund → idempotent execute → partial failure → retry guard → retry success → viewer redaction → exports → reconciliation edit → audit trail) was run against the production build with curl; see `docs/implementation-status.md`.

## Deployment notes

- Switch Prisma to PostgreSQL for anything beyond a single-box evaluation.
- Run one worker: either keep `WORKER_MODE=in-process` on a single long-lived server, or set it to `off` and call `POST /api/worker/run` with the `x-worker-secret` header every few seconds from a scheduler.
- Put the app behind HTTPS; session cookies are `secure` in production.
