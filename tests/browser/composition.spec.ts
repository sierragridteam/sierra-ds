import { test, expect, type Page } from "@playwright/test";

/** App composition guardrails: layouts an app gets right by using the system's classes. */
const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;

test.beforeEach(async ({ page }) => {
  // Keep the map offline: the fallback ground still builds controls.
  await page.route(/tiles\.openfreemap\.org/, (route) => route.abort());
});

test("shell content starts beside the sidebar on wide screens", async ({ page }) => {
  await page.setViewportSize({ width: 2400, height: 1200 });
  await page.goto("/compat/composition");
  const side = await box(page, ".sidebar");
  const main = await box(page, "#main");
  expect(main.x - (side.x + side.width)).toBeLessThanOrEqual(48);
  expect(main.width).toBeGreaterThan(1200);
});

test("client-built map controls follow the theme", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("sierra-theme", "dark"));
  await page.goto("/compat/composition");
  const group = page.locator(".ds-geo-map .maplibregl-ctrl-group");
  await expect(group).toBeVisible({ timeout: 15000 });
  const [background, raised] = await group.evaluate((el) => [
    getComputedStyle(el).backgroundColor,
    getComputedStyle(document.documentElement).getPropertyValue("--surface-raised").trim(),
  ]);
  expect(background).not.toBe("rgb(255, 255, 255)");
  const probe = await page.evaluate((color) => {
    const el = document.createElement("div");
    el.style.color = color;
    document.body.append(el);
    const value = getComputedStyle(el).color;
    el.remove();
    return value;
  }, raised);
  expect(background).toBe(probe);
});

test("a map in a panel fills an equal-height row instead of leaving a dead band", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/compat/composition");
  await expect(page.locator("#map-panel .ds-map-canvas canvas")).toBeVisible({ timeout: 15000 });
  const panel = await box(page, "#map-panel");
  const tall = await box(page, "#tall-panel");
  expect(Math.abs(panel.height - tall.height)).toBeLessThan(2);
  const field = await box(page, "#key-field");
  const footer = await box(page, "#map-panel .card__footer");
  // Only the panel inset separates the body's last block from the source line.
  expect(footer.y - (field.y + field.height)).toBeLessThan(40);
  expect((await box(page, "#map-panel .ds-map-canvas")).height).toBeGreaterThan(300);
});

test("blocks nested in a panel body or banner aside keep the system rhythm", async ({ page }) => {
  await page.goto("/compat/composition");
  for (const id of ["#key-note", "#key-field", "#attention-note"]) {
    const margin = await page.locator(id).evaluate((el) => parseFloat(getComputedStyle(el).marginTop));
    expect(margin, id).toBeGreaterThan(0);
  }
});

test("a long attention title wraps beside its badge on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/compat/composition");
  const badge = await box(page, "#long-item .badge");
  const link = await box(page, "#long-item a");
  expect(link.x).toBeGreaterThan(badge.x + badge.width);
  expect(link.y).toBeLessThan(badge.y + badge.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("plain sidebar footer text reads as a caption", async ({ page }) => {
  await page.goto("/compat/composition");
  const [place, detail, body] = await page.evaluate(() => [
    getComputedStyle(document.querySelector("#footer-place")!).fontSize,
    getComputedStyle(document.querySelector("#footer-detail")!).fontSize,
    getComputedStyle(document.body).fontSize,
  ]);
  expect(parseFloat(place)).toBeLessThan(parseFloat(body));
  expect(parseFloat(detail)).toBeLessThan(parseFloat(body));
});
