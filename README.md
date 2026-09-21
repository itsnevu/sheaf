# Sheaf

Batch contractor payments in digital assets for finance teams: prepare, approve, coordinate and reconcile many payouts from one controlled workflow. **Private externally. Transparent internally.**

- Marketing site, dashboard, CSV import and validation, route preparation, four-eyes approval, funding, queued execution with per-payment tracking and retries, reconciliation and exports, audit trail, roles.
- Demo mode (default) simulates routing with a deterministic mock provider and labels every record as simulated. Real mode quotes routes from Relay and signs with the treasury wallet in the browser.

## Quick start

```bash
cp .env.example .env            # set SESSION_SECRET, WORKER_SECRET, SHEAF_ENCRYPTION_KEY
npm install
npm run db:push && npm run db:seed
npm run dev
```

Open http://localhost:3000, sign in as `finance@northwind.example` / `sheaf-demo-2026` (also `owner@`, `approver@`, `viewer@`).

## Documentation

- [Architecture](docs/architecture.md)
- [Development guide](docs/development.md) (setup, env vars, demo scenarios, real-mode requirements, tests)
- [Deployment](docs/deployment.md) (Docker image, PostgreSQL, secrets, worker topology, launch checklist)
- [Implementation status](docs/implementation-status.md) (what was verified, limitations, next steps)
- [Privacy threat model](docs/security/privacy-threat-model.md)
- [Relay integration research](docs/research/relay-integration-research.md)
- [EarnHop design research](docs/research/earnhop-design-research.md)

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run check` (lint + typecheck + test) · `npm test` · `npm run test:e2e` · `npm run db:push` · `npm run db:seed` · `npm run db:harden` · `npm run db:encrypt` · `npm run db:provider -- postgresql` · `npm run db:studio`
