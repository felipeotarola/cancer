import { test, expect } from "@playwright/test";

test("real Eve server: public health and protected application/session routes", async ({ request }) => {
  const health = await request.get("/eve/v1/health");
  expect(health.ok()).toBe(true);
  expect(await health.json()).toMatchObject({ ok: true, status: "ready" });
  const workspace = await request.get("/api/workspace");
  expect(workspace.status()).toBe(401);
  const session = await request.post("/eve/v1/session", { data: {} });
  expect(session.status()).toBe(401);
});

test("login screen renders and public config contains only browser-safe Supabase fields", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole('heading', { name: 'Välkommen tillbaka' })).toBeVisible();
  const config = await (await request.get('/api/auth/config')).json();
  expect(Object.keys(config).sort()).toEqual(['publishableKey', 'url']);
  await page.getByRole('button', { name: 'Ny här? Skapa konto' }).click();
  await expect(page.getByRole('heading', { name: 'Skapa ditt konto' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/cancer-auth-mobile.png' });
  expect(errors).toEqual([]);
});
