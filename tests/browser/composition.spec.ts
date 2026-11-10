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
  const group = page.locator("#map-host .ds-geo-map .maplibregl-ctrl-group");
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

test("a selected map label near the right edge sits left of its point", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/compat/composition");
  await expect(page.locator("#edge-map .ds-map-canvas canvas")).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.locator("#edge-map").evaluate((el: any) => el.map?.getLayer("ds-label-selected") ? el.map.getLayoutProperty("ds-label-selected", "text-variable-anchor")?.[0] : null), { timeout: 15000 }).toBe("right");
});

test("clicking a map feature opens a card beside it; a thin line is easy to hit; close and empty clicks clear it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/compat/composition");
  const host = page.locator("#card-map");
  await host.scrollIntoViewIfNeeded();
  await expect.poll(() => host.evaluate((el: any) => !!el.map?.getLayer("ds-lines-hit")), { timeout: 15000 }).toBe(true);
  await page.waitForTimeout(300);
  const at = (lngLat: [number, number], dx = 0) => host.evaluate((el: any, [ll, d]) => { const p = el.map.project(ll); const r = el.map.getCanvas().getBoundingClientRect(); return { x: r.left + p.x + d, y: r.top + p.y }; }, [lngLat, dx] as const);
  // The point.
  let p = await at([-120.35, 38.25]);
  await page.mouse.click(p.x, p.y);
  const card = host.locator(".ds-map-card");
  await expect(card).toContainText("Arnold");
  await expect(card).toContainText("A node");
  // 5 px off a 1 px line still selects it, and the card moves to the line.
  p = await at([-120.365, 38.115], 5);
  await page.mouse.click(p.x, p.y);
  await expect(card).toContainText("Sonora ↔ Arnold");
  await expect(host.locator(".ds-map-card")).toHaveCount(1);
  // Close button clears the selection.
  await card.getByRole("button", { name: "Close details" }).click();
  await expect(host.locator(".ds-map-card")).toHaveCount(0);
  await expect(host).toHaveAttribute("data-cleared", "");
  expect(await host.evaluate((el: any) => el.selected)).toBeUndefined();
  // Empty map clears too.
  p = await at([-120.35, 38.25]);
  await page.mouse.click(p.x, p.y);
  await expect(host.locator(".ds-map-card")).toHaveCount(1);
  p = await at([-120.0, 38.1]);
  await page.mouse.click(p.x, p.y);
  await expect(host.locator(".ds-map-card")).toHaveCount(0);
});

test("a stat tile's action is a top-right icon and the whole tile is the target", async ({ page }) => {
  await page.goto("/compat/elements");
  const tile = page.locator("#client-stat .stat");
  const action = tile.getByRole("link", { name: "Browse events" });
  const [t, a] = [(await tile.boundingBox())!, (await action.boundingBox())!];
  expect(a.x + a.width).toBeGreaterThan(t.x + t.width - 40);
  expect(a.y).toBeLessThan(t.y + 40);
  // Clicking the tile's lower area follows the link.
  await tile.click({ position: { x: 20, y: t.height - 10 } });
  await expect(page).toHaveURL(/\/events\/\?a=1&b=2$/);
});

test("a corridor strip places sections, stops and markers along the route, and turns vertical when narrow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/compat/elements");
  const strip = page.locator("#client-corridor .ds-corridor__track");
  const track = (await strip.boundingBox())!;
  const closed = (await page.locator("#client-corridor .ds-corridor__section--alarm").boundingBox())!;
  // 33..71 of 71 km.
  expect(Math.abs(closed.x - (track.x + track.width * 33 / 71))).toBeLessThan(2);
  expect(Math.abs(closed.x + closed.width - (track.x + track.width))).toBeLessThan(2);
  const work = (await page.locator("#client-corridor .ds-corridor__marker").first().boundingBox())!;
  expect(Math.abs(work.x + work.width / 2 - (track.x + track.width * 25 / 71))).toBeLessThan(2);
  // The last stop label ends at the right edge, not past it.
  const last = (await page.locator("#client-corridor .ds-corridor__stop.is-last").boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(track.x + track.width + 3);
  // Screen readers get the sections and markers in order, with the marker's link.
  await expect(page.locator("#client-corridor ol.sr-only li")).toHaveCount(5);
  await expect(page.locator("#client-corridor ol.sr-only a")).toHaveAttribute("href", "/events/?record=1");
  // Narrow: the track runs vertically.
  const narrow = (await page.locator("#client-corridor-narrow .ds-corridor__track").boundingBox())!;
  expect(narrow.height).toBeGreaterThan(narrow.width * 5);
});

test("a schedule draws windows on a shared time axis with day ticks and a now line", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/compat/elements");
  const root = page.locator("#client-schedule");
  await expect(root.locator(".ds-schedule__row:not(.ds-schedule__axis)")).toHaveCount(2);
  await expect(root.locator(".ds-schedule__now-label")).toHaveText("Now");
  await expect(root.locator(".ds-schedule__bar")).toHaveCount(4);
  // 7 local midnights in a 7-day window starting at midnight Pacific.
  await expect(root.locator(".ds-schedule__tick")).toHaveCount(7);
  await expect(root.locator(".ds-schedule__tick").first()).toHaveText("Tue 10");
  await expect(root.locator(".ds-schedule__now")).toHaveCount(2);
  // A window that started before the domain is clipped to its start.
  const track = (await root.locator(".ds-schedule__track").nth(1).boundingBox())!;
  const long = (await root.locator(".ds-schedule__bar--alarm").boundingBox())!;
  expect(Math.abs(long.x - track.x)).toBeLessThan(2);
  expect(Math.abs(long.x + long.width - (track.x + track.width))).toBeLessThan(2);
  await expect(root.locator(".ds-schedule__bar").first().locator(".sr-only")).toContainText("Drainage work");
});
