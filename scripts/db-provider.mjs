#!/usr/bin/env node
/**
 * Switch the Prisma datasource provider between sqlite (default, zero setup) and postgresql.
 *   npm run db:provider -- postgresql
 *   npm run db:provider -- sqlite
 * Then set DATABASE_URL accordingly and run `npm run db:push` (or `npm run db:migrate`).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const target = process.argv[2];
if (!["sqlite", "postgresql"].includes(target ?? "")) {
  console.error("usage: db-provider <sqlite|postgresql>");
  process.exit(2);
}
const file = new URL("../prisma/schema.prisma", import.meta.url);
const schema = readFileSync(file, "utf8");
const next = schema.replace(/provider\s*=\s*"(sqlite|postgresql)"/, `provider = "${target}"`);
if (next === schema) {
  console.log(`[db-provider] already ${target}`);
} else {
  writeFileSync(file, next);
  console.log(`[db-provider] datasource provider set to ${target}`);
}
execSync("npx prisma generate", { stdio: "inherit" });
