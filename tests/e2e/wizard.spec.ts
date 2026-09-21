import { expect, test } from "@playwright/test";
import { OK_ADDRESSES, csv, expectStatus, sessionFor, signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

test("full demo workflow: create → import → correct → routes → four-eyes approval → fund → execute → reconcile", async ({ page, browser }) => {
  await signIn(page, "finance");

  // 1. Create the batch.
  await page.goto("/app/batches/new");
  await page.getByLabel("Batch name").fill("E2E payroll");
  await page.getByLabel(/internal reference/i).fill("E2E-01");
  await page.getByRole("button", { name: "Create and continue" }).click();
  await page.waitForURL(/\/app\/batches\/(?!new$)[a-z0-9]+$/);
  const batchUrl = page.url();
  await expectStatus(page, "Draft");

  // 2. Upload a CSV with one bad row; every row is kept and reported.
  await page.locator('input[type="file"]').setInputFiles({
    name: "payroll.csv",
    mimeType: "text/csv",
    buffer: csv([
      { name: "Ada Okafor", address: OK_ADDRESSES[0], amount: "1250.00", reference: "INV-1" },
      { name: "Mateo Ruiz", address: OK_ADDRESSES[1], amount: "980.50", reference: "INV-2" },
      { name: "Bad Row", address: "0x123", amount: "10", reference: "INV-3" },
    ]),
  });
  await expect(page.getByText("Invalid rows", { exact: true }).locator("..")).toContainText("1");
  await page.getByRole("button", { name: /import 3 rows/i }).click();
  await expectStatus(page, "Draft");
  await expect(page.getByText(/not a 42-character hex address/i).first()).toBeVisible();

  // 3. Correct the bad row in place.
  const badRow = page.getByRole("row").filter({ hasText: "Bad Row" });
  await badRow.getByRole("button", { name: /edit/i }).click();
  const addressField = page.getByRole("dialog").getByLabel("Wallet address");
  await addressField.fill(OK_ADDRESSES[2]);
  await page.getByRole("dialog").getByRole("button", { name: "Save and re-validate" }).click();
  await expectStatus(page, "Validated");

  // 4. Prepare routes (simulated provider). The wizard advances to the route step by itself.
  await expect(page.getByRole("heading", { name: "Route preparation" })).toBeVisible();
  await page.getByRole("button", { name: "Prepare routes" }).click();
  await expectStatus(page, "Routes prepared");
  // ...and to the review step once every route is quoted.
  await expect(page.getByRole("heading", { name: "Review before approval" })).toBeVisible();
  await expect(page.getByText(/3 recipients|3 payments/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Continue to approval" }).click();
  await expect(page.getByRole("heading", { name: "Approval" })).toBeVisible();

  // Finance edited last, so finance cannot approve.
  await expect(page.getByRole("button", { name: "Approve this batch" })).toHaveCount(0);

  // 5. Approver approves in their own session.
  const approver = await sessionFor(browser, "approver");
  await approver.page.goto(batchUrl);
  await expect(approver.page).toHaveURL(batchUrl);
  await expect(approver.page.getByTestId("batch-status")).toHaveText("Routes prepared");
  await expect(approver.page.getByRole("heading", { name: "Review before approval" })).toBeVisible();
  await approver.page.getByRole("button", { name: "Continue to approval" }).click();
  await approver.page.getByRole("button", { name: "Approve this batch" }).click();
  await approver.page.getByRole("dialog").getByLabel(/note/i).fill("Checked against the register.");
  await approver.page.getByRole("dialog").getByRole("button", { name: "Approve 3 payments" }).click();
  await expectStatus(approver.page, "Approved");
  // Approver cannot fund or execute.
  await expect(approver.page.getByRole("button", { name: "Record simulated funding" })).toHaveCount(0);
  await approver.context.close();

  // 6. Finance funds (simulated) and executes.
  await page.reload();
  await expectStatus(page, "Approved");
  await page.getByRole("button", { name: "Record simulated funding" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Record funding" }).click();
  await expectStatus(page, "Funded");
  await page.getByRole("button", { name: "Execute (simulated)" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Confirm and execute" }).click();
  await expectStatus(page, "Executing");

  // 7. All three simulated payments settle; the batch completes and reconciles.
  await expectStatus(page, "Completed");
  await expect(page.getByText("3/3", { exact: false }).first()).toBeVisible();

  // 8. Reconciliation shows matched rows and the export is audited.
  await page.goto("/app/reconciliation");
  // Search runs against decrypted names/references and plaintext addresses; the address is unique to this batch.
  await page.getByLabel("Search payments").fill(OK_ADDRESSES[0]);
  await expect(page.getByRole("row").filter({ hasText: "Ada Okafor" })).toHaveCount(1);
  await expect(page.getByRole("row").filter({ hasText: "Ada Okafor" })).toContainText("E2E payroll");
  await page.goto("/app/activity");
  await expect(page.getByText(/execution started/i).first()).toBeVisible();
  await expect(page.getByText(/batch completed/i).first()).toBeVisible();
});

test("viewer cannot act on the batch", async ({ page }) => {
  await signIn(page, "viewer");
  await page.goto("/app/batches");
  await page.getByRole("link", { name: /E2E payroll/ }).first().click();
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
