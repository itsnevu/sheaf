import "server-only";

/**
 * Production configuration guard. Runs once at boot (see src/lib/worker/boot.ts) and refuses
 * to serve with placeholder secrets. Development and test keep the relaxed defaults.
 */

const PLACEHOLDERS = new Set(["", "change-me", "change-me-to-a-long-random-string"]);

export function configProblems(env: NodeJS.ProcessEnv = process.env): string[] {
  const problems: string[] = [];
  const production = env.NODE_ENV === "production" && env.NEXT_PHASE !== "phase-production-build";
  if (!production) return problems;

  const secret = env.SESSION_SECRET ?? "";
  if (PLACEHOLDERS.has(secret) || secret.length < 32) problems.push("SESSION_SECRET must be set to at least 32 random characters");
  if (!/^[0-9a-fA-F]{64}$/.test(env.SHEAF_ENCRYPTION_KEY ?? "")) problems.push("SHEAF_ENCRYPTION_KEY must be 64 hex characters (generate: openssl rand -hex 32)");
  const workerMode = env.WORKER_MODE ?? "in-process";
  if (workerMode !== "in-process" && PLACEHOLDERS.has(env.WORKER_SECRET ?? "")) problems.push("WORKER_SECRET must be set when WORKER_MODE is not in-process");
  if (!env.DATABASE_URL) problems.push("DATABASE_URL is required");
  if (env.SHEAF_MODE && !["demo", "real"].includes(env.SHEAF_MODE)) problems.push("SHEAF_MODE must be demo or real");
  if (env.NEXT_PUBLIC_APP_URL && !/^https?:\/\//.test(env.NEXT_PUBLIC_APP_URL)) problems.push("NEXT_PUBLIC_APP_URL must be an absolute URL");
  return problems;
}

let checked = false;

export function assertConfig() {
  if (checked) return;
  checked = true;
  const problems = configProblems();
  if (problems.length) {
    const msg = "Refusing to start with unsafe configuration:\n - " + problems.join("\n - ");
    console.error("[env] " + msg);
    throw new Error(msg);
  }
}
