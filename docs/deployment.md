# Deployment

Sheaf ships as a single Next.js server with a built-in job worker. This guide covers the Docker image, the database, the secrets the server refuses to start without, and the checks to run before the first real batch.

## 1. Secrets and configuration

Generate each secret once and store it in your secret manager. The server validates them at boot in production and exits with a list of problems if any is missing or still a placeholder.

| Variable | How to generate | Notes |
|---|---|---|
| `SESSION_SECRET` | `openssl rand -hex 32` | Signs session token hashes. Rotating it signs everyone out. |
| `SHEAF_ENCRYPTION_KEY` | `openssl rand -hex 32` | AES-256-GCM key for contractor names, internal references and CSV originals. **Losing it makes those fields unreadable.** Back it up together with the database and never store it next to a backup of the data. |
| `WORKER_SECRET` | `openssl rand -hex 16` | Only needed when `WORKER_MODE=off` (external scheduler calls `POST /api/worker/run`). |
| `DATABASE_URL` | — | `file:/data/sheaf.db` for SQLite on a persistent volume, or a PostgreSQL URL. |
| `SHEAF_MODE` | — | `demo` (simulated) or `real` (Relay + treasury wallet). Recorded on every batch; changing it never re-routes old batches. |
| `NEXT_PUBLIC_APP_URL` | — | Public HTTPS origin, used for absolute links and metadata. |
| `RELAY_API_KEY` | from Relay | Real mode only. Raises the 50 quotes/minute public limit. Server-side only. |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | from cloud.reown.com | Optional; adds WalletConnect next to injected wallets in real mode. |

Everything else has a safe default; see `.env.example`.

## 2. Database

**SQLite** (default) suits a single server. Mount a volume at `/data` and set `DATABASE_URL=file:/data/sheaf.db`. Back up the file with `sqlite3 /data/sheaf.db ".backup /backups/sheaf-$(date +%F).db"`; do not copy a live file.

**PostgreSQL** is recommended for anything with more than one operator or where point-in-time recovery matters:

```bash
npm run db:provider -- postgresql      # switches prisma/schema.prisma and regenerates the client
export DATABASE_URL=postgresql://sheaf:***@host:5432/sheaf?schema=public
npm run db:push                        # or: npx prisma migrate dev --name init, then npm run db:migrate in production
```

`npm run db:push` and the Docker entrypoint both install the append-only triggers on `AuditEvent` (`scripts/db-harden.ts`). Run `npm run db:harden` again after any manual schema change. The application database user needs `CREATE TRIGGER` (PostgreSQL: ownership of the table or superuser for the first run).

If the database was populated before encryption was enabled, run `npm run db:encrypt` once with the production key.

## 3. Docker

```bash
docker build -t sheaf .
docker run -d --name sheaf -p 3000:3000 \
  -v sheaf-data:/data \
  -e DATABASE_URL=file:/data/sheaf.db \
  -e SESSION_SECRET=... -e SHEAF_ENCRYPTION_KEY=... -e WORKER_SECRET=... \
  -e SHEAF_MODE=demo -e NEXT_PUBLIC_APP_URL=https://pay.example.com \
  sheaf
```

The entrypoint applies the schema and triggers, then starts the standalone server as a non-root user. Set `SHEAF_SEED_DEMO=1` on a fresh volume to load the Northwind Labs demo workspace, and `SHEAF_SKIP_MIGRATE=1` if migrations run from a separate job. `/api/health` returns `{"ok":true,...}` and the image has a `HEALTHCHECK` on it.

`docker-compose.yml` runs the app with PostgreSQL 16 for a local production-like stack (`docker compose up --build` after switching the provider and filling `.env`).

## 4. Worker topology

The execution worker moves money in demo mode and polls the provider in both modes.

- **One long-lived server** (Docker, a VM, Railway, Fly, Render): keep `WORKER_MODE=in-process`. It starts with the first request and ticks every `WORKER_INTERVAL_MS`.
- **Several replicas or serverless**: set `WORKER_MODE=off` on every instance and have one scheduler call `POST /api/worker/run` with header `x-worker-secret: $WORKER_SECRET` every 2–5 seconds. Jobs are claimed with a conditional update, so concurrent calls never run the same job twice.

Restarting the server is safe in every state. In demo mode, simulated submissions live in process memory, so a restart during execution leaves those attempts `UNKNOWN` for manual review (they are never resent).

## 5. Reverse proxy

Terminate TLS in front of the app and forward `X-Forwarded-For` (the sign-in rate limiter keys on it). The app sets `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a referrer policy and a permissions policy on every response, and marks session cookies `Secure` in production. Add an edge rate limit as well if the app runs on several replicas.

## 6. Pre-launch checklist

- [ ] `npm run check` and `npm run test:e2e` pass on the release commit (CI runs both).
- [ ] Production secrets generated and stored; `SHEAF_ENCRYPTION_KEY` backed up separately from the database.
- [ ] Database on a persistent volume or managed PostgreSQL with automated backups; a restore has been rehearsed.
- [ ] `/api/health` reachable from the load balancer; alerts on non-200.
- [ ] Exactly one worker path enabled (in-process on one instance, or scheduler → `/api/worker/run`).
- [ ] First organisation created through `/sign-up` (creates the Owner); demo seed **not** loaded in production.
- [ ] Four-eyes approval left on in Settings; retry limit reviewed.
- [ ] Real mode only: treasury address set in Settings, `RELAY_API_KEY` configured, and one small batch executed on Base Sepolia (`RELAY_API_URL=https://api.testnets.relay.link`, chain `84532`) with a funded test wallet before any mainnet run.

## 7. Upgrades

1. Back up the database.
2. Deploy the new image; the entrypoint applies schema changes (`prisma db push`) and re-installs the triggers. For PostgreSQL with a migration history, use `npm run db:migrate` instead and set `SHEAF_SKIP_MIGRATE=1`.
3. Check `/api/health` and the activity feed.
