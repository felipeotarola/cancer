import { test, expect } from "@playwright/test";

test("workspace reaches the top; agent and integrations use the full main area", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveTitle("OpenCancer — Din workspace");
  await expect(page.locator(".brand strong").first()).toHaveText(
    "OpenCancer",
  );
  const panel = page.locator(".workspace-pane");
  expect(await panel.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
  expect(await panel.evaluate((el) => el.getBoundingClientRect().height)).toBe(
    900,
  );
  await expect(
    page
      .getByRole("navigation", { name: "Workspace-vyer" })
      .getByRole("button"),
  ).toHaveCount(1);
  for (const name of ["Testning", "Material", "Vault"]) {
    await expect(page.getByRole("button", { name, exact: true })).toHaveCount(
      0,
    );
  }
  await page
    .getByRole("textbox", { name: "Ditt meddelande" })
    .fill("Ett utkast som ska finnas kvar");
  await page
    .getByRole("button", { name: "Dölj workspace", exact: true })
    .click();
  await expect
    .poll(() =>
      panel.evaluate((el) => Math.round(el.getBoundingClientRect().width)),
    )
    .toBe(64);
  expect(await panel.evaluate((el) => el.getBoundingClientRect().top)).toBe(0);
  await page.screenshot({
    path: "test-results/workspace-full-height.png",
    fullPage: true,
  });
  for (const name of ["Agenten", "Integrationer"]) {
    await page
      .locator(".desktop-sidebar")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name, exact: true, level: 1 }),
    ).toBeVisible();
    await expect(panel).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Dölj workspace", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Öppna workspace", exact: true }),
    ).toHaveCount(0);
    expect(
      await page
        .locator(".feature-page")
        .evaluate((el) => Math.round(el.getBoundingClientRect().right)),
    ).toBe(1440);
  }
  await page.screenshot({
    path: "test-results/integrations-full-width.png",
    fullPage: true,
  });
  await page
    .locator(".desktop-sidebar")
    .getByRole("button", { name: "Översikt", exact: true })
    .click();
  await expect(panel).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Ditt meddelande" }),
  ).toHaveValue("Ett utkast som ska finnas kvar");
});

test("mobile workspace can reopen using its rail toggle; standalone pages hide panel tabs", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await page
    .getByRole("button", { name: "Dölj workspace", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Chatt", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Öppna workspace", exact: true })
    .click();
  await expect(page.getByLabel("Översikt – arbetsyta")).toBeVisible();
  await page
    .getByRole("button", { name: "Öppna navigation", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Integrationer", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Integrationer", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", { name: "Panel", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
