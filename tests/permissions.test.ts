import { describe, expect, it } from "vitest";
import { ForbiddenError, assertCan, can, capabilitiesFor, type Capability } from "@/lib/auth/permissions";
import { ROLES } from "@/lib/domain/states";
import { recipientDTO } from "@/lib/serialize";

const ALL: Capability[] = ["batch.view", "batch.create", "batch.edit", "batch.prepare", "batch.approve", "batch.fund", "batch.execute", "payment.retry", "recipient.viewFullAddress", "csv.viewOriginal", "reconciliation.edit", "export.download", "settings.edit", "members.manage"];

describe("capability matrix", () => {
  it("owner has every capability", () => {
    expect(ALL.every((c) => can("OWNER", c))).toBe(true);
  });
  it("separates duties between finance admin and approver", () => {
    expect(can("FINANCE_ADMIN", "batch.approve")).toBe(false);
    expect(can("FINANCE_ADMIN", "batch.fund")).toBe(true);
    expect(can("FINANCE_ADMIN", "batch.execute")).toBe(true);
    expect(can("APPROVER", "batch.approve")).toBe(true);
    expect(can("APPROVER", "batch.fund")).toBe(false);
    expect(can("APPROVER", "batch.execute")).toBe(false);
    expect(can("APPROVER", "batch.edit")).toBe(false);
    expect(can("APPROVER", "csv.viewOriginal")).toBe(false);
  });
  it("finance admin cannot manage the organization", () => {
    expect(can("FINANCE_ADMIN", "settings.edit")).toBe(false);
    expect(can("FINANCE_ADMIN", "members.manage")).toBe(false);
  });
  it("viewer is read-only and redacted", () => {
    expect(capabilitiesFor("VIEWER")).toEqual(["batch.view"]);
    expect(can("VIEWER", "recipient.viewFullAddress")).toBe(false);
    expect(can("VIEWER", "export.download")).toBe(false);
  });
  it("unknown roles have nothing", () => {
    expect(can("ROOT" as never, "batch.view")).toBe(false);
    expect(capabilitiesFor("ROOT" as never)).toEqual([]);
  });
  it("every role at least views batches", () => {
    for (const r of ROLES) expect(can(r, "batch.view")).toBe(true);
  });
  it("assertCan throws a 403 error", () => {
    expect(() => assertCan("VIEWER", "batch.create")).toThrow(ForbiddenError);
    try {
      assertCan("VIEWER", "batch.create", "custom");
    } catch (e) {
      expect((e as ForbiddenError).status).toBe(403);
      expect((e as ForbiddenError).message).toBe("custom");
    }
    expect(() => assertCan("OWNER", "batch.create")).not.toThrow();
  });
});

describe("address redaction in DTOs", () => {
  const row = {
    id: "r1", batchId: "b1", rowNumber: 1, name: "Ada", addressInput: "0x1b3f9c2a8e4d6f7a9b0c1d2e3f4a5b6c7d8e9f0a", address: "0x1B3f9C2a8E4D6F7a9b0C1D2e3F4A5b6C7D8E9f0A", amountInput: "1", amount: "1000000", assetSymbol: "USDC", reference: null, valid: true, errors: "[]", warnings: "[]", status: "PENDING", attemptCount: 0, lastError: null, scheduledFor: null, submittedAt: null, completedAt: null, createdAt: new Date(), updatedAt: new Date(),
  };
  it("viewers see a prefix only", () => {
    const dto = recipientDTO(row as never, "VIEWER");
    expect(dto.address).toBe("0x1B3f…••••");
    expect(dto.addressRedacted).toBe(true);
    expect(dto.addressInput).not.toContain("9f0a");
  });
  it("approvers and finance see the full address", () => {
    expect(recipientDTO(row as never, "APPROVER").address).toBe(row.address);
    expect(recipientDTO(row as never, "FINANCE_ADMIN").addressRedacted).toBe(false);
  });
});
