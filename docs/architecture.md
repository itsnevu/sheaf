# Sheaf architecture

## Overview

Sheaf is a single Next.js 14 (App Router) application with a Prisma/SQLite database, an in-process job worker, and a provider adapter that separates payment routing (Relay, or a deterministic mock in demo mode) from business logic.

```
┌──────────────────────────────── Browser ────────────────────────────────┐
│ Marketing site (RSC)   Dashboard (client components + React Query)      │
│                        CSV Web Worker (parse + validate off-thread)     │
│                        Real mode only: wagmi/viem wallet console        │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ JSON over same-origin fetch, cookie session
┌───────────────▼──────────────── Next.js server ─────────────────────────┐
│ src/app/api/**           Route handlers: auth, batches, payments, recon │
│ src/lib/http.ts          session + capability checks, error mapping     │
│ src/lib/services/*       Batch lifecycle (create → cancel), invariants  │
│ src/lib/worker/*         Job queue (Prisma), handlers, in-process loop  │
│ src/lib/providers/*      PaymentProvider: MockProvider | RelayProvider  │
│ src/lib/csv/*, money.ts  Exact validation, bigint money                 │
│ src/lib/audit.ts         Append-only AuditEvent writer                  │
└───────────────┬─────────────────────────────────────────────────────────┘
                │ Prisma
┌───────────────▼──────────────── SQLite / PostgreSQL ────────────────────┐
│ Organization, User, Membership, Session, PaymentBatch, BatchRecipient,  │
│ PaymentRoute, Approval, FundingTransaction, ExecutionAttempt,           │
│ AuditEvent, ReconciliationRecord, Job                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                                        ▲
                     real mode only: POST /quote/v2, GET /intents/status/v3
                                                        │
                                              api.relay.link
```

## Important technical decisions

| Decision | Why |
|---|---|
| Money as integer base-unit strings + `bigint` | No floating point anywhere near amounts. `src/lib/money.ts` parses and formats exactly; the DB stores strings because SQLite has no decimal type. |
| Batch `mode` captured at creation | Flipping `SHEAF_MODE` cannot silently convert a simulated batch into a real one or vice versa; execution refuses on mismatch. |
| Approval bound to `recipientSetHash` | Any change to a valid recipient's address or amount recomputes the hash and invalidates approvals server-side. Reference-only edits do not. |
| One job per payment, DB-backed queue | Execution never runs inside a single HTTP request. Jobs are claimed with a conditional `updateMany` so concurrent workers cannot double-run; idempotency keys `exec:batch:recipient:attempt` make re-runs after a crash no-ops. |
| Never retry through an unknown state | If the last attempt is `PENDING`, `SUBMITTED` or `UNKNOWN`, both the worker and the retry endpoint refuse. Unreachable provider status stops polling after 8 consecutive failures and flags the row for manual review instead of resending. |
| Provider adapter, no SDK | The Relay HTTP API is small and verified; calling it directly keeps the server bundle free of the SDK and makes the mock provider a drop-in. |
| Browser-side signing in real mode | The server never holds a private key. Route steps (unsigned transactions) are shown to the connected treasury wallet; the server records hashes and polls. |
| Roles enforced in `requireSession(capability)` | Every route handler declares the capability it needs. Viewer redaction happens in `serialize.ts`, so redacted data never leaves the server. |
| Worker boot from the root layout | `ensureWorker()` starts the interval once per Node process on the first request. Serverless or multi-instance deployments set `WORKER_MODE=off` and call `POST /api/worker/run` from a scheduler. |
| SQLite by default | Zero-setup local runs. Switch the Prisma provider to PostgreSQL for production; no raw SQL is used. |

## Lifecycle states

Batch: `DRAFT → VALIDATED → ROUTES_PREPARED → APPROVED → FUNDED → EXECUTING → COMPLETED | PARTIALLY_FAILED | FAILED`, with `CANCELLED` reachable until `FUNDED`. Transitions are listed in `src/lib/domain/states.ts` and checked by `canTransition`.

Recipient: `PENDING → ROUTED | ROUTE_UNAVAILABLE → SCHEDULED → SUBMITTED → CONFIRMING → COMPLETED | FAILED | RETRY_ELIGIBLE | REFUNDED`, plus `CANCELLED`.

Attempt: `PENDING → SUBMITTED → CONFIRMED | FAILED | REFUNDED | UNKNOWN`.

Route: `QUOTED → CONSUMED` (used by an attempt) or `STALE` / `UNAVAILABLE`.

## Request flow for one batch (demo mode)

1. `POST /api/batches` creates the batch with the org's asset/chain and the server mode.
2. `POST /api/batches/:id/csv` validates (shared validator, also run in the browser worker for preview), replaces recipients, stores the original CSV and hash, recomputes aggregates.
3. `PATCH/DELETE /recipients/:rid` correct or remove rows; money changes drop the route and invalidate approvals.
4. `POST /routes` enqueues `prepare_routes`; the worker quotes every recipient through the provider and stores `PaymentRoute` rows with steps, fees and expiry.
5. `POST /approve` (Approver/Owner, four-eyes) verifies fresh routes and the hash, writes an `Approval`.
6. `POST /fund` records a simulated funding event (demo) or a wallet-attested balance (real).
7. `POST /execute` schedules one `execute_route` job per recipient (with optional bounded jitter); idempotent.
8. Worker: `execute_route` creates an `ExecutionAttempt`, submits through the provider, enqueues `poll_route`; `poll_route` advances the attempt/recipient/reconciliation state and rolls up the batch status.
9. `POST /api/payments/:rid/retry` re-quotes and re-queues a `RETRY_ELIGIBLE` row only.
10. `GET /api/export` produces the accounting CSV with a `simulated` column; every export is audited.

## Directory map

```
prisma/schema.prisma        data model (comments document each enum)
prisma/seed.ts              demo organisation and batches
src/app/(marketing)         public site: /, /security, /docs, /privacy
src/app/(auth)              /sign-in, /sign-up
src/app/app                 dashboard: overview, batches, batch detail (wizard + execution),
                            payments, activity, reconciliation, settings
src/app/api                 route handlers
src/components/ui           design-system primitives (Button, Input, StatusBadge, Dialog, …)
src/components/site         marketing components (HeroVisual, ProductPreview, header/footer)
src/components/app          dashboard components (wizard, CSV upload + worker, tables, panels)
src/lib                     domain, services, providers, worker, auth, csv, money
tests/                      vitest unit tests
docs/                       research, security model, this file, development, status
```
