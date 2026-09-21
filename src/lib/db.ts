import { Prisma, PrismaClient } from "@prisma/client";
import { decryptString, encryptString } from "@/lib/crypto";

/**
 * Prisma client with two extensions:
 *  - personal data fields are encrypted on write and decrypted on read (see src/lib/crypto.ts);
 *  - AuditEvent rows can only be created. Any update or delete through this client throws,
 *    and scripts/db-harden.ts adds database triggers so raw SQL cannot bypass it either.
 */

const ENCRYPTED_FIELDS: Record<string, string[]> = {
  BatchRecipient: ["name", "reference"],
  PaymentBatch: ["csvOriginal"],
};

const WRITE_OPS = new Set(["create", "createMany", "update", "updateMany", "upsert"]);
const AUDIT_FORBIDDEN = new Set(["update", "updateMany", "delete", "deleteMany", "upsert"]);

function encryptData(data: unknown, fields: string[]): void {
  if (!data || typeof data !== "object") return;
  if (Array.isArray(data)) {
    data.forEach((d) => encryptData(d, fields));
    return;
  }
  const obj = data as Record<string, unknown>;
  for (const f of fields) {
    const v = obj[f];
    if (typeof v === "string") obj[f] = encryptString(v);
    else if (v && typeof v === "object" && typeof (v as { set?: unknown }).set === "string") {
      (v as { set: string }).set = encryptString((v as { set: string }).set);
    }
  }
}

export function createPrismaClient() {
  const base = new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
  return base.$extends({
    name: "sheaf",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model === "AuditEvent" && AUDIT_FORBIDDEN.has(operation)) {
            throw new Error(`AuditEvent is append-only (${operation} refused)`);
          }
          const fields = ENCRYPTED_FIELDS[model];
          if (fields && WRITE_OPS.has(operation)) {
            const a = args as { data?: unknown; create?: unknown; update?: unknown };
            encryptData(a.data, fields);
            encryptData(a.create, fields);
            encryptData(a.update, fields);
          }
          return query(args);
        },
      },
    },
    result: {
      batchRecipient: {
        name: { needs: { name: true }, compute: (r) => decryptString(r.name) },
        reference: { needs: { reference: true }, compute: (r) => decryptString(r.reference) },
      },
      paymentBatch: {
        csvOriginal: { needs: { csvOriginal: true }, compute: (b) => decryptString(b.csvOriginal) },
      },
    },
  });
}

export type Db = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: Db };

export const db: Db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export { Prisma };
