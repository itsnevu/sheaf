# Implementation status

Last updated 21 September 2026.

## Verified commands (run during this build)

| Command | Result |
|---|---|
| `npm install` | OK (Node 24.19, npm 11.17) |
| `npx prisma db push`, `npm run db:seed` | OK |
| `npm test` | 22 tests, 3 files, all passing |
| `npm run typecheck` | OK, no errors |
| `npm run build` (includes `next lint`) | OK; production bundle: dashboard pages 106–128 kB first load, marketing 88–102 kB |
| `next start -p 3100` | OK; worker boots on first request; `/api/health` returns `ok` |
| curl end-to-end workflow against the production server | all assertions held (details below) |
| Headless Chrome screenshots of every route at 1440 px and 390 px | no console errors, no page errors, no horizontal overflow after fixes |

## End-to-end workflow assertions (demo mode, production build)

- Viewer cannot create a batch (403); Finance admin can.
- Executing a `DRAFT` batch is refused (409). Uploading a CSV never executes anything.
- `.xlsx` rejected; missing `address` column rejected with the found headers listed; empty file rejected.
- Scenario CSV of 8 rows: 5 valid, 3 invalid (bad address format, non-numeric amount, duplicate wallet), all rows retained and reported per row; exact total `245.63 USDC`.
- Correcting the bad address row made it valid; removing two rows re-validated the batch (`VALIDATED`, 6 valid).
- Approval before routes refused. Route preparation quoted 5 routes and reported 1 unavailable (`NO_QUOTES` scenario) with the batch kept in `VALIDATED`; removing that row moved it to `ROUTES_PREPARED`.
- Finance admin cannot approve (403); Approver approved with the recipient-set hash and total recorded.
- Editing only the reference kept the approval active; editing an amount invalidated it (`INVALIDATED: Recipient row 1 changed`) and dropped that route.
- Re-prepare, re-approve, then Approver cannot fund (403); Finance admin recorded simulated funding.
- `POST /execute` started 5 payments; a second call returned `already executing` without creating jobs.
- Outcome after ~15 s: 2 completed (matched), 1 permanent failure (`BLOCKED_WALLET`, exception), 1 retry-eligible (`SOLVER_CAPACITY_EXCEEDED`), 1 refunded; batch `PARTIALLY_FAILED`.
- Retry of the permanent failure and of a completed row refused (409); Viewer retry refused (403); retry of the transient row accepted; a second retry while the attempt was pending refused with `ATTEMPT_PENDING`; the retry then succeeded (attempt 2 `CONFIRMED`) and the row was marked `MATCHED`.
- Viewer sees `0x1b3f…••••` and cannot export (403). Finance export CSV includes `mode=demo`, `simulated=true`, checksummed addresses, references, statuses, attempts and fee estimates.
- Original CSV download: Approver 403, Finance admin 200 (audited).
- Reconciliation search found the row; state updated to `RESOLVED` with a note (audited).
- 36 audit events recorded for the batch in order.

## Feature status

| Area | Status |
|---|---|
| Marketing site (hero, product visualisation, problem/solution, how it works, features, privacy & security, CTA, footer, security page, docs page, privacy notice) | Complete |
| Original brand (mark, wordmark, palette, type system, tokens, components) | Complete |
| Higgsfield assets (hero still life, routing still life, OG image) | Generated with Nano Banana Pro, optimised to JPG (77 KB, 100 KB, 40 KB), integrated |
| Auth (sign-up creates org + Owner, sign-in, sign-out, scrypt, hashed session tokens, 14-day cookie) | Complete |
| Roles and server-side capability checks, org isolation, viewer redaction, four-eyes | Complete |
| Dashboard overview, batch list with search/filter, batch wizard (6 steps, resumable), batch detail, payment detail, activity feed with filters and pagination, reconciliation with search/filters/pagination/edit, settings (org, treasury, network/asset, jitter, retries, four-eyes, members) | Complete |
| CSV import: template, type/size limits, worker-based parsing, header aliases, per-row errors, duplicate/asset detection, preview, in-place correction/removal, server re-validation | Complete |
| Route preparation and review with labelled estimates and unavailable states | Complete |
| Approval bound to recipient-set hash, invalidation on change, revocation | Complete |
| Funding (simulated in demo; wallet-attested balance in real) | Complete (real path untested on-chain) |
| Execution engine: DB job queue, conditional claims, idempotency keys, bounded retries, backoff, unknown-state guard, partial completion, batch roll-up | Complete |
| Jitter (bounded 0–30 min, deadline-aware, off by default, timestamps retained) | Complete |
| Reconciliation records, exports with simulated flag, export/download audit | Complete |
| Relay adapter (quote v2, status v3, retryable classification) | Implemented; quoting and status verified live; execution not exercised on-chain |
| Real-mode wallet console (injected wallets, network switch, balance check, per-step signing) | Implemented; not exercised with a funded wallet |
| Responsive layouts (stacked cards under 768 px, tables on desktop, mobile nav) | Complete; verified by screenshots |
| Accessibility basics (semantic landmarks, labels, focus rings, `role=status`/`alert`, dialogs via `<dialog>`, reduced motion, status never colour-only) | Complete; no automated audit run |

## Known limitations

- No field-level encryption at rest; no immutable audit store.
- EVM addresses only; no ENS.
- Real mode: no on-chain execution performed during development. WalletConnect is not wired (injected wallets only).
- Public Relay limit (50 quotes/min) bounds route preparation without an API key; the worker paces at ~2 quotes/1.3 s in real mode.
- The mock provider keeps simulated submissions in memory; a server restart mid-execution leaves those attempts `UNKNOWN` (by design, never resent) and they must be reviewed manually. Restarting is safe for all other states.
- In-process worker is single-instance; use the HTTP trigger for multi-instance hosts.
- Same-chain, same-token routes provide no external privacy (flagged in the UI).
- No email delivery: invited members receive a temporary password shown once to the inviter.
- No automated accessibility or Lighthouse run was performed.

## Remaining tasks (suggested order)

1. Funded Base Sepolia test of the real-mode signing loop; then add WalletConnect.
2. Envelope encryption for recipient PII and CSV originals; database-level append-only protection for `AuditEvent`.
3. PostgreSQL migration and a dedicated worker process.
4. Playwright end-to-end suite for the wizard and the wallet console; axe accessibility pass.
5. Relay API key, referrer, and a conversation with Relay about private request indexing.
6. Optional: `useDepositAddress` flow for custodial treasuries; non-EVM address validation.
