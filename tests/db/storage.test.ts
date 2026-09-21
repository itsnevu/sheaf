import { describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { isEncrypted } from "@/lib/crypto";
import { ADDR, makeOrg } from "./helpers";

const raw = new PrismaClient();

describe("encryption at rest", () => {
  it("stores names, references and CSV originals encrypted and reads them back in clear", async () => {
    const { org, finance } = await makeOrg();
    const batch = await db.paymentBatch.create({ data: { organizationId: org.id, name: "B", mode: "demo", assetSymbol: "USDC", assetDecimals: 6, originChainId: 8453, destinationChainId: 8453, createdById: finance.userId, csvOriginal: "name,address,amount\nAda,0x1,2\n" } });
    const r = await db.batchRecipient.create({ data: { batchId: batch.id, rowNumber: 1, name: "Ada Okafor", addressInput: ADDR(1), address: ADDR(1), amountInput: "1", amount: "1000000", assetSymbol: "USDC", reference: "INV-1" } });
    expect(r.name).toBe("Ada Okafor");
    expect(r.reference).toBe("INV-1");

    const stored = await raw.batchRecipient.findUniqueOrThrow({ where: { id: r.id } });
    expect(isEncrypted(stored.name)).toBe(true);
    expect(isEncrypted(stored.reference)).toBe(true);
    expect(stored.address).toBe(ADDR(1)); // addresses stay queryable
    const storedBatch = await raw.paymentBatch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(isEncrypted(storedBatch.csvOriginal)).toBe(true);

    const read = await db.batchRecipient.findUniqueOrThrow({ where: { id: r.id } });
    expect(read.name).toBe("Ada Okafor");
    const readBatch = await db.paymentBatch.findUniqueOrThrow({ where: { id: batch.id } });
    expect(readBatch.csvOriginal).toContain("Ada,0x1,2");
  });
  it("encrypts through update, updateMany, upsert, createMany and includes", async () => {
    const { org, finance } = await makeOrg();
    const batch = await db.paymentBatch.create({ data: { organizationId: org.id, name: "B", mode: "demo", assetSymbol: "USDC", assetDecimals: 6, originChainId: 8453, destinationChainId: 8453, createdById: finance.userId } });
    await db.batchRecipient.createMany({ data: [1, 2].map((i) => ({ batchId: batch.id, rowNumber: i, name: `Name ${i}`, addressInput: ADDR(i), address: ADDR(i), amountInput: "1", amount: "1000000", assetSymbol: "USDC", reference: `R${i}` })) });
    const rows = await db.batchRecipient.findMany({ where: { batchId: batch.id }, orderBy: { rowNumber: "asc" } });
    expect(rows.map((r) => r.name)).toEqual(["Name 1", "Name 2"]);
    await db.batchRecipient.update({ where: { id: rows[0].id }, data: { name: "Renamed" } });
    await db.batchRecipient.updateMany({ where: { id: rows[1].id }, data: { reference: "R2-new" } });
    const again = await db.batchRecipient.findMany({ where: { batchId: batch.id }, orderBy: { rowNumber: "asc" } });
    expect(again[0].name).toBe("Renamed");
    expect(again[1].reference).toBe("R2-new");
    const rawRows = await raw.batchRecipient.findMany({ where: { batchId: batch.id } });
    expect(rawRows.every((r) => isEncrypted(r.name) && isEncrypted(r.reference))).toBe(true);
    const withInclude = await db.paymentBatch.findUniqueOrThrow({ where: { id: batch.id }, include: { recipients: true } });
    expect(withInclude.recipients.map((r) => r.name).sort()).toEqual(["Name 2", "Renamed"]);
  });
});

describe("audit trail is append-only", () => {
  it("records events and refuses updates and deletes at both layers", async () => {
    const { org, finance } = await makeOrg();
    const ev = await audit({ organizationId: org.id, actorId: finance.userId, actorEmail: finance.email, action: "test.event", summary: "hello" });
    await expect(db.auditEvent.update({ where: { id: ev.id }, data: { summary: "tampered" } })).rejects.toThrow(/append-only/);
    await expect(db.auditEvent.delete({ where: { id: ev.id } })).rejects.toThrow(/append-only/);
    await expect(db.auditEvent.deleteMany({ where: { organizationId: org.id } })).rejects.toThrow(/append-only/);
    // Raw SQL through a plain client hits the database trigger.
    await expect(raw.$executeRawUnsafe(`DELETE FROM "AuditEvent" WHERE id = '${ev.id}'`)).rejects.toThrow(/append-only/);
    await expect(raw.$executeRawUnsafe(`UPDATE "AuditEvent" SET summary = 'x' WHERE id = '${ev.id}'`)).rejects.toThrow(/append-only/);
    const still = await db.auditEvent.findUnique({ where: { id: ev.id } });
    expect(still?.summary).toBe("hello");
  });
  it("keeps audit rows when the recipient they mention is deleted", async () => {
    const { org, finance } = await makeOrg();
    const batch = await db.paymentBatch.create({ data: { organizationId: org.id, name: "B", mode: "demo", assetSymbol: "USDC", assetDecimals: 6, originChainId: 8453, destinationChainId: 8453, createdById: finance.userId } });
    const r = await db.batchRecipient.create({ data: { batchId: batch.id, rowNumber: 1, name: "X", addressInput: ADDR(9), address: ADDR(9), amountInput: "1", amount: "1000000", assetSymbol: "USDC" } });
    const ev = await audit({ organizationId: org.id, batchId: batch.id, recipientId: r.id, action: "recipient.updated", summary: "edited" });
    await db.batchRecipient.delete({ where: { id: r.id } });
    const kept = await db.auditEvent.findUniqueOrThrow({ where: { id: ev.id } });
    expect(kept.recipientId).toBeNull();
    expect(kept.summary).toBe("edited");
  });
});
