import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const ground = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const LIGHT = "rgb(243, 239, 228)";
const DARK = "rgb(18, 26, 22)";
const header = (page: Page) => page.locator(".demo-header sierra-theme-switcher");

test("first visit follows the system preference before any choice", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  expect(await ground(page)).toBe(DARK);
  await expect(header(page).getByRole("radio", { name: "System" })).toBeChecked();
  await page.emulateMedia({ colorScheme: "light" });
  expect(await ground(page)).toBe(LIGHT);
  await expect(page.locator("#theme-status")).toHaveText(
    "Following the system: light.",
  );
});

test("an explicit choice overrides the system, persists and syncs switchers", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await header(page).getByRole("radio", { name: "Light" }).check();
  expect(await ground(page)).toBe(LIGHT);
  await expect(
    page.locator("#theme sierra-theme-switcher").first().getByRole("radio", {
      name: "Light",
    }),
  ).toBeChecked();
  await page.goto("/charts");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await ground(page)).toBe(LIGHT);
});

test("the switcher is a keyboard-operable radio group", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const group = page.locator("#theme sierra-theme-switcher").first();
  await expect(group.getByRole("group", { name: "Colour theme" })).toBeVisible();
  await group.getByRole("radio", { name: "System" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect(group.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await ground(page)).toBe(DARK);
});

test("scoped regions keep their own theme whatever the page uses", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const lightPanel = page.locator('.sg__theme[data-theme="light"]');
  await expect(lightPanel).toHaveCSS("background-color", LIGHT);
  await expect(lightPanel.locator(".btn--primary")).toHaveCSS(
    "background-color",
    "rgb(29, 91, 63)",
  );
  await expect(page.locator('.sg__theme[data-theme="dark"]')).toHaveCSS(
    "background-color",
    DARK,
  );
});

for (const path of ["/", "/data", "/charts"]) {
  test(`dark ${path} has no contrast violations`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(path);
    expect(await ground(page)).toBe(DARK);
    const results = await new AxeBuilder({ page })
      .withRules(["color-contrast"])
      .analyze();
    expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target))).toEqual([]);
  });
}

test("the theme survives Astro ClientRouter navigation", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/client-router");
  await header(page).getByRole("radio", { name: "Dark" }).check();
  await page.evaluate(() => ((window as any).__beforeNavigation = true));
  await page.click("#client-nav");
  await expect(page.locator("h1")).toHaveText("Second page");
  expect(await page.evaluate(() => (window as any).__beforeNavigation)).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await ground(page)).toBe(DARK);
  await expect(header(page).getByRole("radio", { name: "Dark" })).toBeChecked();
});
