import { expect, test } from "@playwright/test";
import { privateKeyToAccount } from "viem/accounts";
import { signIn } from "./helpers";

const WALLET = privateKeyToAccount("0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318");

test.describe("public site and auth", () => {
  test("marketing pages render without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Link prefetches cancelled by the next navigation log a benign "Failed to fetch RSC payload" line.
    page.on("console", (m) => m.type() === "error" && !/Failed to fetch RSC payload/.test(m.text()) && errors.push(m.text()));
    for (const path of ["/", "/security", "/docs", "/privacy"]) {
      const res = await page.goto(path, { waitUntil: "networkidle" });
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

  test("rejects a wrong password and signs in the desk operator", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("desk@halden.example");
    await page.getByLabel("Password").fill("nope");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText(/incorrect/i)).toBeVisible();
    await signIn(page, "desk");
    await expect(page.getByRole("status")).toContainText(/demo/i);
    await expect(page.getByRole("status")).toContainText(/Desk operator · Halden Desk/);
    // The application menu sits behind the red mark on every viewport.
    await page.getByRole("button", { name: "Open navigation" }).click();
    await expect(page.getByRole("navigation", { name: "Application" })).toBeVisible();
    for (const label of ["OPERATIONS_###", "EXECUTIONS_###", "RECONCILIATION_###", "ACTIVITY_###", "SETTINGS_###"]) {
      await expect(page.getByRole("navigation", { name: "Application" }).getByText(label)).toBeVisible();
    }
  });

  test("signs in with an injected wallet and lands in a fresh workspace", async ({ page }) => {
    await page.exposeFunction("__sheafSign", async (hexMessage: string) => WALLET.signMessage({ message: { raw: hexMessage as `0x${string}` } }));
    await page.addInitScript((address) => {
      const listeners: Record<string, Array<(...a: unknown[]) => void>> = {};
      (window as unknown as { ethereum: unknown }).ethereum = {
        isMetaMask: true,
        request: async ({ method, params }: { method: string; params?: unknown[] }) => {
          if (method === "eth_requestAccounts" || method === "eth_accounts") return [address];
          if (method === "eth_chainId") return "0x2105";
          if (method === "personal_sign") return (window as unknown as { __sheafSign: (m: string) => Promise<string> }).__sheafSign(String(params?.[0]));
          throw new Error(`unsupported ${method}`);
        },
        on: (e: string, fn: (...a: unknown[]) => void) => ((listeners[e] ??= []).push(fn), undefined),
        removeListener: () => undefined,
      };
    }, WALLET.address);
    await page.goto("/sign-in");
    await page.getByTestId("wallet-signin").click();
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 });
    await expect(page.getByRole("status")).toContainText(/Workspace 0x/i);
  });

  test("viewer is read-only with redacted addresses", async ({ page }) => {
    await signIn(page, "viewer");
    await page.goto("/app/batches");
    await expect(page.getByRole("link", { name: /new operation/i })).toHaveCount(0);
    // Redaction happens on the server: the viewer's own session never receives a full address.
    const res = await page.request.get("/api/reconciliation?pageSize=50");
    expect(res.ok(), await res.text()).toBe(true);
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
