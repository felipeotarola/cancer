import { test, expect } from "@playwright/test";
test("chat, persistence, search, themes and panel controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Vad vill du undersöka?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Välj filer till workspace" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/desktop-light.png",
    fullPage: true,
  });
  await page
    .getByRole("textbox", { name: "Ditt meddelande" })
    .fill("Hej OpenCancer");
  await page.getByRole("button", { name: "Skicka meddelande" }).click();
  await expect(
    page.getByText("OpenCancer skriver", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("article", { name: "OpenCancer", exact: true }),
  ).toContainText("Hej!");
  await page.reload();
  await expect(
    page.getByRole("article", { name: "Du", exact: true }),
  ).toContainText("Hej OpenCancer");
  await expect(
    page.getByRole("article", { name: "OpenCancer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Byt färgtema", exact: true })
    .first()
    .click();
  await expect(page.locator("html")).toHaveClass("dark");
  await page.screenshot({
    path: "test-results/desktop-dark.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Ny chatt", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Ditt meddelande" })
    .fill("Stoppa detta");
  await page.getByRole("button", { name: "Skicka meddelande" }).click();
  await page.getByRole("button", { name: "Stoppa svar" }).click();
  await expect(
    page.getByRole("article", { name: "OpenCancer", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Sök chattar", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Sök chattar" })
    .fill("Hej OpenCancer");
  await expect(page.locator(".desktop-sidebar .thread")).toHaveCount(1);
  await page.locator(".desktop-sidebar .thread").click();
  await expect(
    page.getByRole("article", { name: "OpenCancer", exact: true }),
  ).toBeVisible();
  const separator = page.getByRole("separator");
  await separator.focus();
  await page.keyboard.press("ArrowRight");
  await expect(separator).toHaveAttribute("aria-valuenow", "50");
  await page
    .getByRole("button", { name: "Dölj workspace", exact: true })
    .click();
  await expect(page.locator(".workspace-pane")).toHaveClass(/is-collapsed/);
  await expect(
    page.getByRole("navigation", { name: "Kompakt workspace", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Visa workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dölj navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Visa navigation", exact: true })
    .click();
  expect(errors).toEqual([]);
});
test("mobile navigation focus, workspace, dark chat and overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("textbox", { name: "Ditt meddelande" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/mobile-light.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Öppna navigation" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Byt färgtema" })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Öppna navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Workspace", exact: true }).click();
  await expect(page.locator(".workspace-canvas")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Välj filer till workspace" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Workspace-vyer" })
    .getByRole("button", { name: "Översikt" })
    .click();
  await expect(page.getByLabel("Översikt – arbetsyta")).toBeVisible();
  await page.getByRole("button", { name: "Chatt", exact: true }).click();
  await page.getByRole("textbox", { name: "Ditt meddelande" }).fill("Min plan");
  await page.getByRole("textbox", { name: "Ditt meddelande" }).press("Enter");
  await expect(
    page.getByRole("article", { name: "OpenCancer", exact: true }),
  ).toContainText("steg för steg");
  await page.screenshot({
    path: "test-results/mobile-dark.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true);
});
