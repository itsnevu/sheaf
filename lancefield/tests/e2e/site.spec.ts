import { expect, test, type Page } from "@playwright/test";

/** Pages that must render, with the console clean. Runs on desktop and a phone viewport. */
async function cleanConsole(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to fetch RSC payload|favicon/.test(m.text()) && errors.push(m.text()));
  return errors;
}

test.describe("public pages", () => {
  test("home renders the brand, the live counts and every anchor section", async ({ page }) => {
    const errors = await cleanConsole(page);
    const res = await page.goto("/", { waitUntil: "networkidle" });
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("banner").getByRole("link", { name: "Lancefield home" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    for (const id of ["how", "ranking", "settlement", "pricing", "agents", "faq"]) await expect(page.locator(`#${id}`)).toHaveCount(1);
    await expect(page.getByRole("status")).toContainText(/demo season/i);
    await expect(page.getByText(/ROOST/i)).toHaveCount(0);
    expect(errors).toEqual([]);
    // no horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);
  });

  test("briefs list filters by kind and phase through the URL", async ({ page }) => {
    await page.goto("/briefs", { waitUntil: "networkidle" });
    const cards = page.locator('main a[href^="/briefs/"]');
    await expect(cards.first()).toBeVisible();
    await expect(page.locator("main")).toContainText(/USDG/);
    await page.goto("/briefs?kind=copy&phase=open", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText(/copy/i);
    await expect(page.locator("main")).not.toContainText(/Launch poster for a small-batch coffee/);
    await page.goto("/briefs?q=zzzz-no-such-brief", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText(/no briefs|nothing/i);
  });

  test("a settled brief shows the winner and the ranked entries", async ({ page }) => {
    await page.goto("/briefs?phase=settled", { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /sleep-tracking ring/i }).first().click();
    await page.waitForURL(/\/briefs\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/sleep-tracking ring/i);
    await expect(page.getByText(/winner/i).first()).toBeVisible();
    await expect(page.getByText("Know how you slept before the day asks.")).toBeVisible();
    await expect(page.getByText(/settlement/i).first()).toBeVisible();
  });

  test("posting a brief asks for a wallet signature first", async ({ page }) => {
    await page.goto("/briefs/new", { waitUntil: "networkidle" });
    await expect(page.getByRole("button", { name: /sign in with wallet/i }).first()).toBeVisible();
    await expect(page.getByText(/no funds|nothing is deposited|does not move/i).first()).toBeVisible();
  });

  test("agent guide, standings, early access and legal pages render", async ({ page }) => {
    for (const [path, needle] of [
      ["/agents", /register/i],
      ["/standings", /points/i],
      ["/early-access", /email/i],
      ["/terms", /terms/i],
      ["/privacy", /privacy/i],
    ] as const) {
      const res = await page.goto(path, { waitUntil: "networkidle" });
      expect(res?.status(), path).toBe(200);
      await expect(page.locator("main"), path).toContainText(needle);
    }
    const skill = await page.request.get("/skill.md");
    expect(skill.status()).toBe(200);
    expect(skill.headers()["content-type"]).toContain("text/markdown");
    expect(await skill.text()).toContain("/v1/agents/register");
  });

  test("early access form validates and stores a sign-up", async ({ page }) => {
    await page.goto("/early-access?role=agent", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /ask for early access|early access/i }).first().click();
    await expect(page.getByRole("alert").first()).toBeVisible();
    await page.getByLabel(/email/i).fill(`e2e-${Date.now()}@example.com`);
    await page.getByRole("button", { name: /ask for early access|early access/i }).first().click();
    await expect(page.locator("main")).toContainText(/on the list|thank|we will|you're in|you are in/i);
  });

  test("unknown routes get the branded 404", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);
    await expect(page.locator("main")).toContainText(/field/i);
  });
});

test.describe("public API", () => {
  test("endpoint map, briefs and leaderboard respond with the documented shape", async ({ request }) => {
    const root = await (await request.get("/v1")).json();
    expect(root.ok).toBe(true);
    expect(root.endpoints).toBeTruthy();
    const briefs = await (await request.get("/v1/briefs?phase=open")).json();
    expect(briefs.ok).toBe(true);
    expect(Array.isArray(briefs.briefs)).toBe(true);
    const lb = await (await request.get("/v1/leaderboard")).json();
    expect(lb.ok).toBe(true);
    expect(lb.rows.length).toBeGreaterThan(0);
    const unauth = await request.post(`/v1/briefs/${briefs.briefs[0].id}/entries`, { data: { body: "x" } });
    expect(unauth.status()).toBe(401);
    const bad = await request.post("/v1/agents/register", { data: { handle: "!!", wallet: "nope" } });
    expect(bad.status()).toBe(400);
    expect((await bad.json()).error.code).toBe("invalid");
  });
});
