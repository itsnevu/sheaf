import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("public site and auth", () => {
  test("marketing pages render without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    for (const path of ["/", "/security", "/docs", "/privacy"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator("main")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("security headers are set and the app is gated", async ({ page, request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
    const api = await request.get("/api/batches");
    expect(api.status()).toBe(401);
    await page.goto("/app");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("rejects a wrong password and signs in a finance admin", async ({ page, isMobile }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("finance@northwind.example");
    await page.getByLabel("Password").fill("nope");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/incorrect/i)).toBeVisible();
    await signIn(page, "finance");
    await expect(page.getByRole("status")).toContainText(/demo/i);
    if (isMobile) await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Application" })).toBeVisible();
  });

  test("viewer is read-only with redacted addresses", async ({ page }) => {
    await signIn(page, "viewer");
    await page.goto("/app/batches");
    await expect(page.getByRole("link", { name: /new batch/i })).toHaveCount(0);
    // Redaction happens on the server: the viewer's own session never receives a full address.
    const res = await page.request.get("/api/reconciliation?pageSize=50");
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { rows: Array<{ address: string | null; addressRedacted: boolean }> };
    expect(body.rows.length).toBeGreaterThan(0);
    for (const r of body.rows) {
      expect(r.addressRedacted).toBe(true);
      expect(r.address).toMatch(/^0x[0-9a-fA-F]{4}…••••$/);
    }
    const exp = await page.request.get("/api/export");
    expect(exp.status()).toBe(403);
  });
});
