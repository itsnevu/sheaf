/**
 * Database-level protection for the audit trail. Adds triggers that abort any UPDATE or DELETE
 * on AuditEvent, so the append-only rule holds even for raw SQL or another client.
 * Idempotent. Run after every `prisma db push` / migration: npm run db:harden
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SQLITE = [
  `CREATE TRIGGER IF NOT EXISTS audit_event_no_update BEFORE UPDATE ON "AuditEvent" BEGIN SELECT RAISE(ABORT, 'AuditEvent is append-only'); END;`,
  `CREATE TRIGGER IF NOT EXISTS audit_event_no_delete BEFORE DELETE ON "AuditEvent" BEGIN SELECT RAISE(ABORT, 'AuditEvent is append-only'); END;`,
];

const POSTGRES = [
  `CREATE OR REPLACE FUNCTION audit_event_append_only() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'AuditEvent is append-only'; END; $$ LANGUAGE plpgsql;`,
  `DROP TRIGGER IF EXISTS audit_event_no_update ON "AuditEvent";`,
  `CREATE TRIGGER audit_event_no_update BEFORE UPDATE OR DELETE ON "AuditEvent" FOR EACH ROW EXECUTE FUNCTION audit_event_append_only();`,
];

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const statements = url.startsWith("file:") ? SQLITE : url.startsWith("postgres") ? POSTGRES : null;
  if (!statements) throw new Error(`Unsupported DATABASE_URL for db-harden: ${url.split(":")[0]}`);
  for (const sql of statements) await db.$executeRawUnsafe(sql);
  console.log(`[db-harden] AuditEvent append-only triggers installed (${url.startsWith("file:") ? "sqlite" : "postgres"})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
