# Sheaf architecture

Sheaf is the private execution desk for Robinhood Chain (chain id 4663). **Private externally. Transparent internally.** A sheaf is one controlled **operation** made of **legs**, executed from one desk. The settlement asset is USDG (6 decimals).

Privacy, in Sheaf's sense, means one thing: the wallet that owns the funds or the eligibility does not appear as the destination on-chain. Amounts, timing and the desk contract address stay visible. Sheaf never describes anything as anonymous, untraceable or unlinkable.

## Overview

Sheaf is a single Next.js 14 (App Router) application with a Prisma/SQLite database, an in-process job worker, and a provider adapter that separates routing (Relay, or a deterministic mock in demo mode) from desk logic.

```
┌──────────────────────────────── Browser ────────────────────────────────┐
│ Site (RSC instruments)  Desk (client components + React Query)          │
│                         CSV Web Worker (parse + validate legs off-thread)│
│                         Real mode only: wagmi/viem wallet console       │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ JSON over same-origin fetch, cookie session
┌───────────────▼──────────────── Next.js server ─────────────────────────┐
│ src/app/api/**           Route handlers: auth, operations, legs, recon  │
│ src/lib/http.ts          session + capability checks, error mapping     │
│ src/lib/services/*       Operation lifecycle (create → cancel)          │
│ src/lib/worker/*         Job queue (Prisma), handlers, in-process loop  │
│ src/lib/providers/*      PaymentProvider: MockProvider | RelayProvider  │
│ src/lib/csv/*, money.ts  Leg validation, bigint money                   │
│ src/lib/audit.ts         Append-only AuditEvent writer                  │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ Prisma
┌───────────────▼──────────────── SQLite / PostgreSQL ────────────────────┐
│ Organization (desk), User, Membership, Session, PaymentBatch (operation),│
│ BatchRecipient (leg), PaymentRoute, Approval, FundingTransaction,       │
│ ExecutionAttempt, AuditEvent, ReconciliationRecord, Job                 │
└─────────────────────────────────────────────────────────────────────────┘
                                                        ▲
                     real mode only: POST /quote/v2, GET /intents/status/v3
                                                        │
                                              api.relay.link
```

## Vocabulary

| Product word | Stored as | Notes |
|---|---|---|
| Desk | `Organization` | Roles: Owner, Desk operator (`FINANCE_ADMIN`), Approver, Viewer |
| Operation (a sheaf) | `PaymentBatch` | `kind` is `CLAIM`, `ACCUMULATE`, `OTC` or `TREASURY` |
| Leg | `BatchRecipient` | `name` is the label, `reference` is the memo, `notBefore` is the earliest execution time |
| Desk wallet | `Organization.treasuryAddress` | The wallet that funds and signs; never a leg's destination |

Model names and status values were kept when the product changed so that data, tests and migrations stayed stable. Everything a person reads (UI, API messages, audit summaries, exports, docs) uses the product words.

## The four operation kinds

Each kind maps to a contract in `contracts/`. The contracts exist; **the application does not call them on-chain yet** (see `implementation-status.md`). Today every leg is a route quoted by the provider (mock or Relay) and, in real mode, signed by the desk wallet.

| Kind | Contract | Legs |
|---|---|---|
| `CLAIM` Private allocation claim | `PrivateClaim` | eligible account → fresh recipient, amount |
| `ACCUMULATE` Stealth accumulation | `StealthDesk` | fresh recipient, amount, not-before; the plan is committed as a Merkle root and executed one leg at a time |
| `OTC` Private OTC block | `OtcEscrow` | a single leg: counterparty, give asset/amount; the memo carries want asset/amount, expiry and the receive-into address |
| `TREASURY` Delegated treasury | `DelegatedTreasury` | to, token, amount; proposer ≠ approver (four-eyes), daily cap |

Robinhood Stock Tokens carry transfer restrictions on sender and receiver, so a fresh, unverified address cannot hold them. USDG can go anywhere. The demo seed includes a leg that fails with `RESTRICTED_TOKEN: recipient not allowlisted (simulated)` to make that visible.

## Important technical decisions

| Decision | Why |
|---|---|
| Money as integer base-unit strings + `bigint` | No floating point anywhere near amounts. `src/lib/money.ts` parses and formats exactly; the DB stores strings because SQLite has no decimal type. |
| Operation `mode` captured at creation | Flipping `SHEAF_MODE` cannot silently convert a simulated operation into a real one or vice versa; execution refuses on mismatch. |
| Operation `kind` captured at creation | The kind picks the contract and the leg semantics shown in the UI; it is stored, exported and audited, never inferred. |
| Approval bound to the leg-set hash | Any change to a valid leg's address or amount recomputes `recipientSetHash` and invalidates approvals server-side. Memo or not-before edits do not. |
| `notBefore` wins over jitter | When execution starts, a leg's job runs at `max(now + jitter, notBefore)`, capped by the operation deadline. |
| One job per leg, DB-backed queue | Execution never runs inside a single HTTP request. Jobs are claimed with a conditional `updateMany` so concurrent workers cannot double-run; idempotency keys `exec:operation:leg:attempt` make re-runs after a crash no-ops. |
| Never retry through an unknown state | If the last attempt is `PENDING`, `SUBMITTED` or `UNKNOWN`, both the worker and the retry endpoint refuse. Unreachable provider status stops polling after 8 consecutive failures and flags the leg for manual review instead of resending. |
| Provider adapter, no SDK | The Relay HTTP API is small and verified; calling it directly keeps the server bundle free of the SDK and makes the mock provider a drop-in. |
| Browser-side signing in real mode | The server never holds a private key. Route steps (unsigned transactions) are shown to the connected desk wallet; the server records hashes and polls. |
| Roles enforced in `requireSession(capability)` | Every route handler declares the capability it needs. Viewer redaction happens in `serialize.ts`, so redacted data never leaves the server. |
| Worker boot from the root layout | `ensureWorker()` starts the interval once per Node process on the first request. Serverless or multi-instance deployments set `WORKER_MODE=off` and call `POST /api/worker/run` from a scheduler. |
| SQLite by default | Zero-setup local runs. Switch the Prisma provider to PostgreSQL for production; no raw SQL is used. |

## Lifecycle states

Operation: `DRAFT → VALIDATED → ROUTES_PREPARED → APPROVED → FUNDED → EXECUTING → COMPLETED | PARTIALLY_FAILED | FAILED`, with `CANCELLED` reachable until `FUNDED`. Transitions are listed in `src/lib/domain/states.ts` and checked by `canTransition`. The desk shows them as seven stages: Legs → Validate → Route → Approve → Fund → Execute → Reconcile.

Leg: `PENDING → ROUTED | ROUTE_UNAVAILABLE → SCHEDULED → SUBMITTED → CONFIRMING → COMPLETED | FAILED | RETRY_ELIGIBLE | REFUNDED`, plus `CANCELLED`.

Attempt: `PENDING → SUBMITTED → CONFIRMED | FAILED | REFUNDED | UNKNOWN`.

Route: `QUOTED → CONSUMED` (used by an attempt) or `STALE` / `UNAVAILABLE`.

## Request flow for one operation (demo mode)

1. `POST /api/batches` creates the operation with its kind, the desk's asset/chain and the server mode.
2. `POST /api/batches/:id/csv` validates the leg CSV (`label,address,asset,amount,not_before,memo`; shared validator, also run in the browser worker for preview), replaces the legs, stores the original CSV and hash, recomputes aggregates.
3. `PATCH/DELETE /recipients/:rid` correct or remove legs; money changes drop the route and invalidate approvals.
4. `POST /routes` enqueues `prepare_routes`; the worker quotes every leg through the provider and stores `PaymentRoute` rows with steps, fees and expiry.
5. `POST /approve` (Approver/Owner, four-eyes) verifies fresh routes and the hash, writes an `Approval`.
6. `POST /fund` records a simulated funding event (demo) or a wallet-attested balance (real).
7. `POST /execute` schedules one `execute_route` job per leg, honouring `notBefore`, optional bounded jitter and the deadline; idempotent.
8. Worker: `execute_route` creates an `ExecutionAttempt`, submits through the provider, enqueues `poll_route`; `poll_route` advances the attempt/leg/reconciliation state and rolls up the operation status.
9. `POST /api/payments/:rid/retry` re-quotes and re-queues a `RETRY_ELIGIBLE` leg only.
10. `GET /api/export` produces the accounting CSV (operation kind, leg, not-before, memo, `simulated` column); every export is audited.

Audit actions use the product words: `operation.*`, `csv.*`, `routes.*`, `funding.*`, `execution.*`, `leg.*`, `reconciliation.*`, `export.*`, `settings.*`, `member.*`.

## Directory map

```
prisma/schema.prisma        data model (comments document each enum and the vocabulary)
prisma/seed.ts              Halden Desk demo: users and five operations
contracts/                  PrivateClaim, StealthDesk, OtcEscrow, DelegatedTreasury (Foundry; not wired to the app)
src/app/(print)             site: /, /security, /docs, /privacy (instruments)
src/app/(auth)              /sign-in, /sign-up
src/app/app                 desk: overview, operations, operation detail (stages), legs (/payments),
                            executions, reconciliation, activity, settings
src/app/api                 route handlers
src/components/ui           primitives (Button, Input, StatusBadge, Dialog, …)
src/components/app          desk components (stepper, kind picker page, CSV upload + worker, leg table, panels)
src/lib                     domain, services, providers, worker, auth, csv, money
tests/                      vitest unit and database tests, Playwright end-to-end
docs/                       research, security model, this file, development, deployment, status
```
