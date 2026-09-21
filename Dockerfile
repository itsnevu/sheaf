# syntax=docker/dockerfile:1.7
# Production image for Sheaf. Builds the Next.js standalone output and runs it as a
# non-root user. Database schema and audit triggers are applied at container start.

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/* \
  && groupadd -r sheaf && useradd -r -g sheaf -d /app sheaf

# Standalone server plus static assets.
COPY --from=build --chown=sheaf:sheaf /app/.next/standalone ./
COPY --from=build --chown=sheaf:sheaf /app/.next/static ./.next/static
COPY --from=build --chown=sheaf:sheaf /app/public ./public
# Prisma CLI, schema, seed and hardening scripts for `entrypoint.sh` (migrations at start).
COPY --from=build --chown=sheaf:sheaf /app/prisma ./prisma
COPY --from=build --chown=sheaf:sheaf /app/scripts ./scripts
COPY --from=build --chown=sheaf:sheaf /app/src/lib/db.ts /app/src/lib/crypto.ts ./src/lib/
COPY --from=build --chown=sheaf:sheaf /app/tsconfig.json ./
COPY --from=build --chown=sheaf:sheaf /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=sheaf:sheaf /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=sheaf:sheaf /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=sheaf:sheaf /app/node_modules/tsx ./node_modules/tsx
COPY --from=build --chown=sheaf:sheaf /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=build --chown=sheaf:sheaf /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=build --chown=sheaf:sheaf /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=build --chown=sheaf:sheaf /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
COPY --chown=sheaf:sheaf docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /data && chown sheaf:sheaf /data

USER sheaf
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fsS http://localhost:3000/api/health || exit 1
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
