# syntax=docker/dockerfile:1.7
FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
ARG NEXT_PUBLIC_APP_URL=http://localhost:3200
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL NEXT_TELEMETRY_DISABLED=1
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates curl && rm -rf /var/lib/apt/lists/* \
  && groupadd -r app && useradd -r -g app -d /app app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
COPY --from=build --chown=app:app /app/prisma ./prisma
COPY --from=build --chown=app:app /app/tsconfig.json ./
COPY --from=build --chown=app:app /app/node_modules/prisma ./node_modules/prisma
COPY --from=build --chown=app:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build --chown=app:app /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build --chown=app:app /app/node_modules/tsx ./node_modules/tsx
COPY --from=build --chown=app:app /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=build --chown=app:app /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=build --chown=app:app /app/node_modules/get-tsconfig ./node_modules/get-tsconfig
COPY --from=build --chown=app:app /app/node_modules/resolve-pkg-maps ./node_modules/resolve-pkg-maps
COPY --from=build --chown=app:app /app/node_modules/viem ./node_modules/viem
COPY --chown=app:app docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /data && chown app:app /data
USER app
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD curl -fsS http://localhost:3000/v1 || exit 1
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
