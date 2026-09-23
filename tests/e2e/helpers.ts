import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const PASSWORD = "sheaf-demo-2026";
/** Seeded Halden Desk users: owner, desk operator (FINANCE_ADMIN), approver, viewer. */
export type Who = "owner" | "desk" | "approver" | "viewer";

export async function signIn(page: Page, who: Who) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(`${who}@halden.example`);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === "/app" || u.pathname.startsWith("/app/"));
}

/** A second signed-in session (different role) in its own cookie jar. */
export async function sessionFor(browser: Browser, who: Who): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, who);
  return { context, page };
}

export const OK_ADDRESSES = [
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
];

/** Leg CSV: label,address,asset,amount,not_before,memo (USDG). */
export function csv(rows: Array<{ name: string; address: string; amount: string; reference?: string; notBefore?: string }>) {
  return Buffer.from("label,address,asset,amount,not_before,memo\n" + rows.map((r) => `${r.name},${r.address},USDG,${r.amount},${r.notBefore ?? ""},${r.reference ?? ""}`).join("\n") + "\n");
}

export async function expectStatus(page: Page, text: string | RegExp) {
  await expect(page.getByTestId("batch-status")).toHaveText(text);
}
