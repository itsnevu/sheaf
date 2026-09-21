/** Runs once per `vitest` invocation: create a fresh, empty SQLite test database. */
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

export default function setup() {
  const root = path.resolve(__dirname, "../..");
  const dbFile = path.join(root, "prisma/test.db");
  let removed = true;
  for (const f of [dbFile, dbFile + "-journal"]) {
    if (!existsSync(f)) continue;
    try {
      rmSync(f);
    } catch {
      removed = false;
    }
  }
  execSync(`npx prisma db push --skip-generate --accept-data-loss${removed ? "" : " --force-reset"}`, { stdio: "pipe", cwd: root, env: { ...process.env, DATABASE_URL: "file:./test.db" } });
}
