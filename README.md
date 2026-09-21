# Sheaf

Batch contractor payments in digital assets for finance teams: prepare, approve, coordinate and reconcile many payouts from one controlled workflow. **Private externally. Transparent internally.**

- Marketing site, dashboard, CSV import and validation, route preparation, four-eyes approval, funding, queued execution with per-payment tracking and retries, reconciliation and exports, audit trail, roles.
- Demo mode (default) simulates routing with a deterministic mock provider and labels every record as simulated. Real mode quotes routes from Relay and signs with the treasury wallet in the browser.

## Quick start

```bash
cp .env.example .env
npm install
npm run db:push && npm run db:seed
npm run dev
```

Open http://localhost:3000, sign in as `finance@northwind.example` / `sheaf-demo-2026` (also `owner@`, `approver@`, `viewer@`).

## Documentation

- [Architecture](docs/architecture.md)
- [Development guide](docs/development.md) (setup, env vars, demo scenarios, real-mode requirements)
- [Implementation status](docs/implementation-status.md) (what was verified, limitations, next steps)
- [Privacy threat model](docs/security/privacy-threat-model.md)
- [Relay integration research](docs/research/relay-integration-research.md)
- [EarnHop design research](docs/research/earnhop-design-research.md)

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm test` · `npm run typecheck` · `npm run lint` · `npm run db:push` · `npm run db:seed` · `npm run db:studio`
