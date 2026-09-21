/** Runs once per `vitest` invocation: create a fresh SQLite test database with the audit triggers. */
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

export default function setup() {
  const dbFile = path.resolve(__dirname, "../../prisma/test.db");
  for (const f of [dbFile, dbFile + "-journal"]) if (existsSync(f)) rmSync(f);
  const env = { ...process.env, DATABASE_URL: "file:./test.db" };
  const opts = { stdio: "pipe" as const, env, cwd: path.resolve(__dirname, "../..") };
  execSync("npx prisma db push --skip-generate --accept-data-loss", opts);
  execSync("npx tsx scripts/db-harden.ts", opts);
}
