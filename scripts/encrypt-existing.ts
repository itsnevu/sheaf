/**
 * One-off migration: encrypt personal data written before field encryption was enabled.
 * Reads raw rows with a plain client, rewrites plaintext values through the encrypting client.
 * Safe to re-run: already-encrypted values are skipped. Run: npm run db:encrypt
 */
import { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "../src/lib/db";
import { isEncrypted } from "../src/lib/crypto";

const raw = new PrismaClient();
const db = createPrismaClient();

async function main() {
  let recipients = 0;
  let batches = 0;
  const rows = await raw.batchRecipient.findMany({ select: { id: true, name: true, reference: true } });
  for (const r of rows) {
    const data: { name?: string; reference?: string } = {};
    if (!isEncrypted(r.name)) data.name = r.name;
    if (r.reference && !isEncrypted(r.reference)) data.reference = r.reference;
    if (Object.keys(data).length) {
      await db.batchRecipient.update({ where: { id: r.id }, data });
      recipients++;
    }
  }
  const bs = await raw.paymentBatch.findMany({ select: { id: true, csvOriginal: true } });
  for (const b of bs) {
    if (b.csvOriginal && !isEncrypted(b.csvOriginal)) {
      await db.paymentBatch.update({ where: { id: b.id }, data: { csvOriginal: b.csvOriginal } });
      batches++;
    }
  }
  console.log(`[encrypt-existing] encrypted ${recipients} recipient row(s) and ${batches} CSV original(s)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await raw.$disconnect();
    await db.$disconnect();
  });
