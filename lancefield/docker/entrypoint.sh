#!/bin/sh
# Apply the schema, seed the demo season on first run, then start the server.
set -eu
echo "[entrypoint] applying database schema"
./node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss >/dev/null
if [ "${SEED_DEMO:-1}" = "1" ]; then
  echo "[entrypoint] seeding demo season (skips if present)"
  ./node_modules/tsx/dist/cli.mjs prisma/seed.ts || echo "[entrypoint] seed skipped"
fi
exec "$@"
