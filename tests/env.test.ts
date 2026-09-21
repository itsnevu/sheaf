import { describe, expect, it } from "vitest";
import { configProblems } from "@/lib/env";

const good = {
  NODE_ENV: "production",
  SESSION_SECRET: "a".repeat(40),
  SHEAF_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  DATABASE_URL: "file:./prod.db",
  WORKER_MODE: "in-process",
  SHEAF_MODE: "demo",
} as NodeJS.ProcessEnv;

describe("configProblems", () => {
  it("accepts a complete production configuration", () => {
    expect(configProblems(good)).toEqual([]);
  });
  it("is relaxed outside production and during next build", () => {
    expect(configProblems({ NODE_ENV: "development" } as NodeJS.ProcessEnv)).toEqual([]);
    expect(configProblems({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" } as NodeJS.ProcessEnv)).toEqual([]);
  });
  it("refuses placeholder secrets", () => {
    const problems = configProblems({ ...good, SESSION_SECRET: "change-me-to-a-long-random-string", SHEAF_ENCRYPTION_KEY: "" });
    expect(problems.some((p) => p.includes("SESSION_SECRET"))).toBe(true);
    expect(problems.some((p) => p.includes("SHEAF_ENCRYPTION_KEY"))).toBe(true);
  });
  it("requires a worker secret when the worker is external", () => {
    expect(configProblems({ ...good, WORKER_MODE: "off", WORKER_SECRET: "change-me" }).some((p) => p.includes("WORKER_SECRET"))).toBe(true);
    expect(configProblems({ ...good, WORKER_MODE: "off", WORKER_SECRET: "b".repeat(32) })).toEqual([]);
  });
  it("flags bad mode and URL values", () => {
    expect(configProblems({ ...good, SHEAF_MODE: "live" }).some((p) => p.includes("SHEAF_MODE"))).toBe(true);
    expect(configProblems({ ...good, NEXT_PUBLIC_APP_URL: "pay.example.com" }).some((p) => p.includes("NEXT_PUBLIC_APP_URL"))).toBe(true);
    expect(configProblems({ ...good, DATABASE_URL: "" }).some((p) => p.includes("DATABASE_URL"))).toBe(true);
  });
});
