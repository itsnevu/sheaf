import { describe, expect, it } from "vitest";
import { canTransition, statusLabel, statusTone } from "@/lib/domain/states";
import { can } from "@/lib/auth/permissions";
import { checkEvmAddress } from "@/lib/address";

describe("batch transitions", () => {
  it("never executes from draft or validated", () => {
    expect(canTransition("DRAFT", "EXECUTING")).toBe(false);
    expect(canTransition("VALIDATED", "EXECUTING")).toBe(false);
    expect(canTransition("APPROVED", "EXECUTING")).toBe(false);
    expect(canTransition("FUNDED", "EXECUTING")).toBe(true);
  });
  it("allows resuming partially failed batches", () => {
    expect(canTransition("PARTIALLY_FAILED", "EXECUTING")).toBe(true);
    expect(canTransition("COMPLETED", "EXECUTING")).toBe(false);
  });
  it("labels and tones exist", () => {
    expect(statusLabel("RETRY_ELIGIBLE")).toBe("Retry eligible");
    expect(statusTone("COMPLETED")).toBe("success");
    expect(statusTone("FAILED")).toBe("danger");
  });
});

describe("permissions", () => {
  it("viewers cannot act", () => {
    expect(can("VIEWER", "batch.view")).toBe(true);
    expect(can("VIEWER", "batch.create")).toBe(false);
    expect(can("VIEWER", "export.download")).toBe(false);
    expect(can("VIEWER", "recipient.viewFullAddress")).toBe(false);
  });
  it("approvers approve but do not execute", () => {
    expect(can("APPROVER", "batch.approve")).toBe(true);
    expect(can("APPROVER", "batch.execute")).toBe(false);
  });
  it("finance admins execute but do not approve", () => {
    expect(can("FINANCE_ADMIN", "batch.execute")).toBe(true);
    expect(can("FINANCE_ADMIN", "batch.approve")).toBe(false);
  });
});

describe("address checks", () => {
  it("validates", () => {
    expect(checkEvmAddress("0x1b3f9c2a8e4d6f7a9b0c1d2e3f4a5b6c7d8e9f0a").ok).toBe(true);
    expect(checkEvmAddress("1b3f9c2a8e4d6f7a9b0c1d2e3f4a5b6c7d8e9f0a")).toMatchObject({ code: "ADDRESS_NO_PREFIX" });
    expect(checkEvmAddress("vitalik.eth")).toMatchObject({ code: "ADDRESS_ENS" });
    expect(checkEvmAddress("0x0000000000000000000000000000000000000000")).toMatchObject({ code: "ADDRESS_ZERO" });
  });
});
