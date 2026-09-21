import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

/** Fresh SQLite database with the demo season for the end-to-end server. */
export default function globalSetup() {
  const root = path.resolve(__dirname, "../..");
  const dbFile = path.join(root, "prisma/e2e.db");
  let removed = true;
  for (const f of [dbFile, dbFile + "-journal"]) {
    if (!existsSync(f)) continue;
    try {
      rmSync(f);
    } catch {
      removed = false;
    }
  }
  const env = { ...process.env, DATABASE_URL: "file:./e2e.db", SESSION_SECRET: "e2e-session-secret-0123456789abcdef0123456789abcdef", SEED_DEMO: "1" };
  const opts = { stdio: "pipe" as const, env, cwd: root };
  execSync(`npx prisma db push --skip-generate --accept-data-loss${removed ? "" : " --force-reset"}`, opts);
  execSync("npx tsx prisma/seed.ts", opts);
}
