#!/bin/sh
# Apply the schema and audit triggers, then start the server.
# SQLite: DATABASE_URL=file:/data/sheaf.db (persist /data). PostgreSQL: DATABASE_URL=postgresql://...
set -eu

if [ "${SHEAF_SKIP_MIGRATE:-0}" != "1" ]; then
  echo "[entrypoint] applying database schema"
  ./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss >/dev/null
  echo "[entrypoint] installing audit triggers"
  ./node_modules/tsx/dist/cli.mjs scripts/db-harden.ts
  if [ "${SHEAF_SEED_DEMO:-0}" = "1" ]; then
    echo "[entrypoint] seeding demo workspace"
    ./node_modules/tsx/dist/cli.mjs prisma/seed.ts
  fi
fi

exec "$@"
