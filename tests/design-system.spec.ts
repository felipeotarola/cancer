import { test, expect } from "@playwright/test";

test("design system uses real components, working dialog, themes and semantic typography", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?view=design-system");
  await expect(
    page.getByRole("heading", { name: /Ett lugnare sätt/ }),
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page
      .locator(".ds-hero h1")
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Inter");
  await expect(
    page.getByRole("button", { name: "Öppna navigation", exact: true }),
  ).toHaveCount(0);
  const trigger = page.getByRole("button", { name: "Prova komponenterna" });
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "Plats för en ny idé" });
  await expect(modal).toBeVisible();
  await expect(
    modal.getByRole("textbox", { name: "Workspace-namn" }),
  ).toBeFocused();
  await modal
    .getByRole("textbox", { name: "Workspace-namn" })
    .fill("Mitt designsystem");
  await modal.getByRole("button", { name: "Spara exempel" }).click();
  await expect(modal).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Mitt designsystem" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/design-system-components.png",
    fullPage: true,
    animations: "disabled",
  });
  const theme = page.getByRole("switch", { name: "Mörkt läge" });
  await theme.click();
  await expect(page.locator("html")).toHaveClass("dark");
  await expect(theme).toHaveAttribute("aria-checked", "true");
  await page.screenshot({
    path: "test-results/design-system-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Typografi", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Typografi med en uppgift" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/design-system-typography.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Grunder", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "En palett med lite mer lugn" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("design system fits mobile and typography stays legible with enlarged text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?view=design-system");
  await expect(
    page.getByRole("heading", { name: /Ett lugnare sätt/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Typografi", exact: true }).click();
  await page.screenshot({
    path: "test-results/design-system-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.addStyleTag({ content: ":root { font-size: 200%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator(".ds-type-row .type-reading")).toBeVisible();
  expect(
    await page
      .locator(".ds-page")
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
});
