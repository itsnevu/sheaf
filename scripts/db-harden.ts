/**
 * Database-level protection for the audit trail. Adds triggers that abort any DELETE on
 * AuditEvent and any UPDATE that changes its content, so the append-only rule holds even for
 * raw SQL or another client. The only permitted update is the database unlinking an event
 * from a batch or recipient that was deleted (batchId / recipientId set to NULL), which keeps
 * the event itself intact. Idempotent. Run after every `prisma db push` / migration:
 *   npm run db:harden
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const SQLITE = [
  `DROP TRIGGER IF EXISTS audit_event_no_update;`,
  `CREATE TRIGGER audit_event_no_update BEFORE UPDATE ON "AuditEvent"
   WHEN NEW.id IS NOT OLD.id
     OR NEW.organizationId IS NOT OLD.organizationId
     OR NEW.actorId IS NOT OLD.actorId
     OR NEW.actorEmail IS NOT OLD.actorEmail
     OR NEW.action IS NOT OLD.action
     OR NEW.summary IS NOT OLD.summary
     OR NEW.payload IS NOT OLD.payload
     OR NEW.createdAt IS NOT OLD.createdAt
     OR (NEW.batchId IS NOT OLD.batchId AND NEW.batchId IS NOT NULL)
     OR (NEW.recipientId IS NOT OLD.recipientId AND NEW.recipientId IS NOT NULL)
   BEGIN SELECT RAISE(ABORT, 'AuditEvent is append-only'); END;`,
  `DROP TRIGGER IF EXISTS audit_event_no_delete;`,
  `CREATE TRIGGER audit_event_no_delete BEFORE DELETE ON "AuditEvent" BEGIN SELECT RAISE(ABORT, 'AuditEvent is append-only'); END;`,
];

const POSTGRES = [
  `CREATE OR REPLACE FUNCTION audit_event_append_only() RETURNS trigger AS $$
   BEGIN
     IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AuditEvent is append-only'; END IF;
     IF NEW.id IS DISTINCT FROM OLD.id
        OR NEW."organizationId" IS DISTINCT FROM OLD."organizationId"
        OR NEW."actorId" IS DISTINCT FROM OLD."actorId"
        OR NEW."actorEmail" IS DISTINCT FROM OLD."actorEmail"
        OR NEW.action IS DISTINCT FROM OLD.action
        OR NEW.summary IS DISTINCT FROM OLD.summary
        OR NEW.payload IS DISTINCT FROM OLD.payload
        OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
        OR (NEW."batchId" IS DISTINCT FROM OLD."batchId" AND NEW."batchId" IS NOT NULL)
        OR (NEW."recipientId" IS DISTINCT FROM OLD."recipientId" AND NEW."recipientId" IS NOT NULL)
     THEN RAISE EXCEPTION 'AuditEvent is append-only'; END IF;
     RETURN NEW;
   END; $$ LANGUAGE plpgsql;`,
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
