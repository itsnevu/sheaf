# Implementation status

Last updated 21 September 2026 (production-hardening pass).

## Verified on this commit

| Command | Result |
|---|---|
| `npm run lint` | OK, no warnings |
| `npm run typecheck` | OK |
| `npm test` | 90 tests in 11 files, all passing (unit + SQLite integration, ~11 s) |
| `npm run build` | OK; standalone output; dashboard pages 107–130 kB first load |
| `npm run test:e2e` | 10 Playwright tests (6 desktop, 4 mobile), all passing, ~45 s |
| Production smoke (`next start`, curl) | security headers present; sign-in rate limit returns 429 on the 11th failed attempt; worker endpoint 401 without the secret; reconciliation search finds decrypted names; original CSV and export decrypt correctly |
| Raw SQL against `AuditEvent` | `UPDATE` and `DELETE` refused by the database trigger (`AuditEvent is append-only`) |
| Storage inspection | `BatchRecipient.name`/`reference` and `PaymentBatch.csvOriginal` stored as `enc1:` ciphertext; addresses and amounts in clear |

## Feature status

| Area | Status |
|---|---|
| Marketing site, brand, generated imagery | Complete |
| Auth (sign-up creates org + Owner, sign-in, sign-out, scrypt, hashed session tokens, 14-day cookie) | Complete; sign-in and sign-up rate limited per IP and per email |
| Roles and server-side capability checks, org isolation, viewer redaction, four-eyes | Complete; full matrix covered by tests |
| Dashboard, batch list, six-step wizard, batch and payment detail, activity feed, reconciliation, settings, members | Complete; wizard covered end-to-end by Playwright |
| CSV import (template, limits, worker parsing, aliases, per-row errors, duplicates, preview, in-place correction, server re-validation) | Complete |
| Route preparation and review | Complete |
| Approval bound to recipient-set hash, invalidation, revocation | Complete |
| Funding (simulated in demo; wallet-attested balance in real) | Complete (real path untested on-chain) |
| Execution engine (DB job queue, conditional claims, idempotency keys, bounded retries, backoff, unknown-state guard, roll-up) | Complete; integration tests cover every outcome |
| Jitter (0–30 min, deadline-aware, off by default) | Complete |
| Reconciliation records, exports with simulated flag, export/download audit | Complete |
| **Encryption at rest** (names, references, CSV originals; AES-256-GCM; key required in production; migration script for older rows) | Complete |
| **Append-only audit trail** (client extension + database triggers; audit rows survive recipient/batch deletion) | Complete |
| **Production configuration guard** (refuses placeholder secrets, missing key, bad mode) | Complete |
| **Security headers, generic 500s in production, constant-time worker secret** | Complete |
| Relay adapter (quote v2, status v3, retryable classification) | Implemented; quoting and status verified live; execution not exercised on-chain |
| Real-mode wallet console (injected wallets, **WalletConnect when a project id is set**, network switch, balance check, per-step signing) | Implemented; not exercised with a funded wallet |
| **Docker image, compose stack with PostgreSQL, provider switch script, CI workflow** | Complete; image build verified in CI configuration (no Docker on the development machine) |
| Responsive layouts and accessibility basics | Complete; mobile viewport covered by the E2E smoke tests; no automated axe run |

## Known limitations

- One server-side encryption key for every organisation; per-organisation keys in a KMS are not implemented. Wallet addresses and amounts are stored in clear because duplicate detection and search need them.
- The audit table is append-only inside the database but is not anchored to an external or immutable store.
- Free-text reconciliation search scans up to 5,000 rows of the organisation after decryption, then paginates. Fine for finance-team volumes; index a blind hash if it ever becomes slow.
- EVM addresses only; no ENS.
- Real mode: no on-chain execution performed during development. The Docker image was not built locally (no Docker installed here); the CI job builds it.
- Public Relay limit (50 quotes/min) bounds route preparation without an API key.
- The mock provider keeps simulated submissions in memory; a restart mid-execution leaves those attempts `UNKNOWN` by design.
- In-process worker is single-instance; use the HTTP trigger for multi-instance hosts.
- Same-chain, same-token routes provide no external privacy (flagged in the UI).
- No email delivery: invited members receive a temporary password shown once to the inviter.
- Sign-in rate limiting is per process; add an edge limit when running several replicas.

## Remaining before real funds

1. **Funded Base Sepolia run** of the real-mode signing loop (`SHEAF_MODE=real`, `RELAY_API_URL=https://api.testnets.relay.link`, chain 84532, treasury set in Settings). Everything up to the wallet signature is tested; the on-chain leg is the only untested path.
2. Relay API key and referrer for production rate limits; ask Relay about private request indexing.
3. Optional hardening: per-organisation KMS keys, external audit anchoring, axe accessibility pass, `useDepositAddress` flow for custodial treasuries, non-EVM address validation.
