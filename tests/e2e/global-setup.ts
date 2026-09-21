import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

/** Fresh, seeded SQLite database for the end-to-end server. */
export default function globalSetup() {
  const root = path.resolve(__dirname, "../..");
  const dbFile = path.join(root, "prisma/e2e.db");
  for (const f of [dbFile, dbFile + "-journal"]) if (existsSync(f)) rmSync(f);
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db", SHEAF_ENCRYPTION_KEY: "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789", SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789abcdef" };
  const opts = { stdio: "pipe" as const, env, cwd: root };
  execSync("npx prisma db push --skip-generate --accept-data-loss", opts);
  execSync("npx tsx scripts/db-harden.ts", opts);
  execSync("npx tsx prisma/seed.ts", opts);
}
