import { test, expect } from "@playwright/test";

test("dragging left collapses chat and dragging the rail right restores its draft", async ({ page }) => {
  await page.goto("/");
  const draft = page.getByRole("textbox", { name: "Ditt meddelande" });
  await draft.fill("Utkast kvar efter dragning");
  const split = (await page.locator(".split-layout").boundingBox())!;
  const separator = page.getByRole("separator", { name: "Ändra panelbredd" });
  async function dragTo(x: number) {
    const grip = (await separator.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, grip.y + grip.height / 2, { steps: 12 });
    await page.mouse.up();
  }
  await dragTo(split.x + 90);
  const reopen = page.getByRole("button", { name: "Öppna chatten", exact: true });
  await expect(reopen).toBeVisible();
  await expect(separator).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator(".chat-column")).toHaveAttribute("inert", "");
  await expect.poll(async () => Math.round((await separator.boundingBox())!.x - split.x)).toBe(56);
  // Merely grabbing the rail must not jump back to the old split width.
  const grip = (await separator.boundingBox())!;
  await page.mouse.move(grip.x, grip.y + grip.height / 2);
  await page.mouse.down();
  await expect(reopen).toBeVisible();
  await page.mouse.up();
  await dragTo(split.x + split.width * 0.4);
  await expect(reopen).toHaveCount(0);
  await expect(draft).toBeVisible();
  await expect(draft).toHaveValue("Utkast kvar efter dragning");
  await expect.poll(async () => Number(await separator.getAttribute("aria-valuenow"))).toBe(40);
});

test("drag handle closes to a rail, reopens and keeps both headers aligned", async ({
  page,
}) => {
  await page.goto("/");
  const panel = page.locator(".workspace-pane");
  const separator = page.getByRole("separator", { name: "Ändra panelbredd" });
  await expect(page.locator(".resize-grip")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fäll ihop workspace" }),
  ).toHaveCount(0);
  const headerBottom = await page
    .locator(".chat-column .topbar")
    .evaluate((el) => el.getBoundingClientRect().bottom);
  expect(
    await page
      .locator(".workspace-header")
      .evaluate((el) => el.getBoundingClientRect().bottom),
  ).toBe(headerBottom);
  const grip = await separator.boundingBox();
  if (!grip) throw new Error("Drag handle missing");
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(1360, 450, { steps: 12 });
  await page.mouse.up();
  await expect(panel).toHaveClass(/is-collapsed/);
  await expect
    .poll(() =>
      panel.evaluate((el) => Math.round(el.getBoundingClientRect().width)),
    )
    .toBe(64);
  await expect(separator).toBeFocused();
  const closedGrip = await separator.boundingBox();
  if (!closedGrip) throw new Error("Collapsed handle missing");
  await page.mouse.move(closedGrip.x, 450);
  await page.mouse.down();
  await page.mouse.move(1000, 450, { steps: 12 });
  await page.mouse.up();
  await expect(panel).toHaveClass(/is-open/);
  await expect
    .poll(() =>
      panel.evaluate((el) => Math.round(el.getBoundingClientRect().width)),
    )
    .toBe(440);
  await separator.press("Home");
  await expect(panel).toHaveClass(/is-collapsed/);
  await separator.press("Enter");
  await expect(panel).toHaveClass(/is-open/);
});

test("quick actions sit side by side and stack in a narrow chat", async ({
  page,
}) => {
  await page.goto("/");
  const ideas = page.getByRole("button", { name: "Utforska en hypotes" });
  const plan = page.getByRole("button", { name: "Planera en översikt" });
  await expect(ideas).toBeVisible();
  const first = await ideas.boundingBox();
  const second = await plan.boundingBox();
  expect(first?.y).toBe(second?.y);
  expect(second!.x).toBeGreaterThan(first!.x);
  await page.screenshot({
    path: "test-results/final-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const narrowFirst = await ideas.boundingBox();
  const narrowSecond = await plan.boundingBox();
  expect(narrowSecond!.y).toBeGreaterThan(narrowFirst!.y);
  await ideas.click();
  await expect(
    page.getByRole("article", { name: "OpenCancer", exact: true }),
  ).toContainText("forskningsfråga");
});
