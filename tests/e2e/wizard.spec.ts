import { expect, test } from "@playwright/test";
import { OK_ADDRESSES, csv, expectStatus, sessionFor, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

test("full demo operation: kind → legs → correct → route → four-eyes approval → fund → execute → reconcile", async ({ page, browser }) => {
  await signIn(page, "desk");

  // 1. Create the operation: pick a kind, then name it.
  await page.goto("/app/batches/new");
  await expect(page.getByRole("button", { name: "Create and add legs" })).toBeDisabled();
  await page.getByTestId("kind-ACCUMULATE").click();
  await expect(page.getByTestId("kind-ACCUMULATE")).toHaveAttribute("aria-checked", "true");
  await page.getByLabel("Operation name").fill("E2E accumulation");
  await page.getByLabel(/internal reference/i).fill("E2E-01");
  await page.getByRole("button", { name: "Create and add legs" }).click();
  await page.waitForURL(/\/app\/batches\/(?!new$)[a-z0-9]+$/);
  const batchUrl = page.url();
  await expectStatus(page, "Draft");
  await expect(page.getByText(/Stealth accumulation · StealthDesk/).first()).toBeVisible();

  // 2. Upload a CSV with one bad leg; every leg is kept and reported.
  await page.locator('input[type="file"]').setInputFiles({
    name: "legs.csv",
    mimeType: "text/csv",
    buffer: csv([
      { name: "Tranche 1", address: OK_ADDRESSES[0], amount: "1250.00", reference: "memo-1", notBefore: "2026-01-01T09:00:00Z" },
      { name: "Tranche 2", address: OK_ADDRESSES[1], amount: "980.50", reference: "memo-2" },
      { name: "Bad Leg", address: "0x123", amount: "10", reference: "memo-3" },
    ]),
  });
  await expect(page.getByText("Invalid legs", { exact: true }).locator("..")).toContainText("1");
  await page.getByRole("button", { name: /import 3 legs/i }).click();
  await expectStatus(page, "Draft");
  await expect(page.getByText(/not a 42-character hex address/i).first()).toBeVisible();

  // 3. Correct the bad leg in place.
  const badRow = page.getByRole("row").filter({ hasText: "Bad Leg" });
  await badRow.getByRole("button", { name: /edit/i }).click();
  const addressField = page.getByRole("dialog").getByLabel("Fresh recipient");
  await addressField.fill(OK_ADDRESSES[2]);
  await page.getByRole("dialog").getByRole("button", { name: "Save and re-validate" }).click();
  await expectStatus(page, "Validated");

  // 4. Prepare routes (simulated provider). The stages advance to Route by themselves.
  await expect(page.getByRole("heading", { name: "Route preparation" })).toBeVisible();
  await page.getByRole("button", { name: "Prepare routes" }).click();
  await expectStatus(page, "Routes prepared");
  // ...and to Approve once every route is quoted.
  await expect(page.getByRole("heading", { name: "Review and approve" })).toBeVisible();
  await expect(page.getByText(/3 valid/i).first()).toBeVisible();

  // The desk operator edited last, so the desk operator cannot approve.
  await expect(page.getByRole("button", { name: "Approve this operation" })).toHaveCount(0);

  // 5. Approver approves in their own session.
  const approver = await sessionFor(browser, "approver");
  await approver.page.goto(batchUrl);
  await expect(approver.page).toHaveURL(batchUrl);
  await expect(approver.page.getByTestId("batch-status")).toHaveText("Routes prepared");
  await expect(approver.page.getByRole("heading", { name: "Review and approve" })).toBeVisible();
  await approver.page.getByRole("button", { name: "Approve this operation" }).click();
  await approver.page.getByRole("dialog").getByLabel(/note/i).fill("Checked against the desk plan.");
  await approver.page.getByRole("dialog").getByRole("button", { name: "Approve 3 legs" }).click();
  await expectStatus(approver.page, "Approved");
  // The stages advance to Fund by themselves; the approver cannot fund or execute.
  await expect(approver.page.getByRole("heading", { name: "Funding" })).toBeVisible();
  await expect(approver.page.getByRole("button", { name: "Record simulated funding" })).toHaveCount(0);
  await approver.context.close();

  // 6. The desk operator funds (simulated) and executes.
  await page.reload();
  await expectStatus(page, "Approved");
  await expect(page.getByRole("heading", { name: "Funding" })).toBeVisible();
  await page.getByRole("button", { name: "Record simulated funding" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Record funding" }).click();
  await expectStatus(page, "Funded");
  await page.getByRole("button", { name: "Execute (simulated)" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm and execute" }).click();
  await expectStatus(page, "Executing");
  await expect(page.getByRole("heading", { name: /Executing leg \d of 3/ })).toBeVisible();

  // 7. All three simulated legs settle; the operation completes and reconciles.
  await expectStatus(page, "Completed");
  await expect(page.getByRole("heading", { name: "Executed 3 of 3 legs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reconcile" })).toBeVisible();

  // 8. Executions and reconciliation list the legs; the activity feed has the lifecycle.
  await page.goto("/app/executions");
  await page.getByLabel("Search executions").fill(OK_ADDRESSES[1]);
  await expect(page.getByRole("row").filter({ hasText: "Tranche 2" })).toHaveCount(1);
  await page.goto("/app/reconciliation");
  // Search runs against decrypted labels/memos and plaintext addresses; the address is unique to this operation.
  await page.getByLabel("Search legs").fill(OK_ADDRESSES[0]);
  await expect(page.getByRole("row").filter({ hasText: "Tranche 1" })).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "Tranche 1" })).toContainText("E2E accumulation");
  await page.goto("/app/activity");
  await expect(page.getByText(/execution started/i).first()).toBeVisible();
  await expect(page.getByText(/operation completed/i).first()).toBeVisible();
});

test("viewer cannot act on the operation", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto("/app/batches");
  await page.getByRole("link", { name: /E2E accumulation/ }).first().click();
  await page.waitForURL(/\/app\/batches\/(?!new$)[a-z0-9]+$/);
  await expect(page.getByRole("button", { name: /execute/i })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /export/i })).toHaveCount(0);
  await expect(page.getByTestId("batch-status")).toHaveText("Completed");
  // The server redacts before the response leaves: no full address reaches a viewer session.
  const id = page.url().split("/").pop()!;
  const res = await page.request.get(`/api/batches/${id}`);
  expect(res.ok()).toBe(true);
  const text = await res.text();
  for (const a of OK_ADDRESSES) expect(text).not.toContain(a.slice(-8));
  expect(text).toContain("••••");
  expect((await page.request.get(`/api/batches/${id}/csv`)).status()).toBe(403);
  expect((await page.request.get(`/api/export?batchId=${id}`)).status()).toBe(403);
});
