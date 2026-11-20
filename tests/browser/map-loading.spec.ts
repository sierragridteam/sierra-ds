import { test, expect, type Page } from "@playwright/test";

/**
 * The map's status line ("Loading map.", then nothing, or a lasting notice)
 * is drawn over the canvas: the map element is the same height from the
 * moment it is on the page, so nothing under it moves.
 *
 * The basemap style request is held and let go, not timed. Every other
 * request to the tile server is refused, so no test waits on a third party.
 */
const ground = { version: 8, sources: {}, layers: [{ id: "ground", type: "background", paint: { "background-color": "#e9e4d8" } }] };

async function mapPage(page: Page, style: "held" | "refused") {
  let open!: () => void;
  const held = new Promise<void>((resolve) => (open = resolve));
  await page.route(/tiles\.openfreemap\.org/, (route) => route.abort());
  await page.route("**/styles/positron*", async (route) => {
    if (style === "refused") return route.abort();
    await held;
    await route.fulfill({ json: ground, headers: { "access-control-allow-origin": "*" } }).catch(() => {});
  });
  // Every height the map element takes from the moment it is on the page, and where the page under it starts.
  await page.addInitScript(() => {
    const seen = ((window as any).__mapHeights = [] as string[]);
    const record = () => {
      const map = document.querySelector("#page-map"), after = document.querySelector("#after-map");
      if (map && after) seen.push(`${map.getBoundingClientRect().height} ${after.getBoundingClientRect().top - map.getBoundingClientRect().top}`);
    };
    const sizes = new ResizeObserver(record);
    new MutationObserver(() => {
      const map = document.querySelector("#page-map");
      if (!map) return;
      sizes.observe(map);
      record();
    }).observe(document, { childList: true, subtree: true, characterData: true, attributes: true });
  });
  await page.goto("/compat/map-loading");
  const map = page.locator("#page-map");
  return {
    map,
    status: map.locator("[role=status]"),
    open,
    heights: () => page.evaluate(() => [...new Set((window as any).__mapHeights as string[])]),
    built: () => expect.poll(() => map.evaluate((el: any) => !!el.map?.getLayer("ds-points")), { timeout: 15000 }).toBe(true),
  };
}
const box = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!;
const inside = (inner: { x: number; y: number; width: number; height: number }, outer: typeof inner) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
const apart = (a: { x: number; y: number; width: number; height: number }, b: typeof a) =>
  a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;

for (const width of [1280, 390]) {
  test(`a map is the same height from mount to loaded, with its basemap held (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const { map, status, open, heights, built } = await mapPage(page, "held");
    // On the page, the basemap has not answered: the longest a reader waits on a slow connection.
    await expect(status).toHaveText("Loading map.");
    await expect(status).toBeVisible();
    const loading = (await map.boundingBox())!.height;
    expect(loading).toBeGreaterThan(400);
    const line = await box(page, "#page-map [role=status]"), canvas = await box(page, "#page-map .ds-map-canvas");
    open();
    await built();
    await expect(status).toBeHidden();
    expect((await map.boundingBox())!.height).toBe(loading);
    expect(await heights()).toHaveLength(1);
    // The line was read over the canvas, not under it.
    expect(inside(line, canvas)).toBe(true);
  });
}

test("a map without its basemap says so over the canvas, clear of the zoom controls, and is no taller", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const { map, status, heights, built } = await mapPage(page, "refused");
  await built();
  await expect(status).toContainText("Geometry only");
  await expect(status).toBeVisible();
  const line = await box(page, "#page-map [role=status]");
  expect(inside(line, await box(page, "#page-map .ds-map-canvas"))).toBe(true);
  expect(apart(line, await box(page, "#page-map .maplibregl-ctrl-group"))).toBe(true);
  // The map fits its features below the notice, so it covers none of them.
  const tops = await map.evaluate((el: any) => el.props.data.features.flatMap((f: any) => (f.geometry.type === "Point" ? [f.geometry.coordinates] : f.geometry.coordinates)).map((c: [number, number]) => el.map.getCanvas().getBoundingClientRect().top + el.map.project(c).y));
  expect(Math.min(...tops)).toBeGreaterThan(line.y + line.height);
  // A later resource error replaces the notice in the same place.
  await map.evaluate((el: any) => el.map.fire("error", { error: new Error("tile") }));
  await expect(status).toContainText("Some map resources are unavailable");
  const error = await box(page, "#page-map [role=status]");
  expect(inside(error, await box(page, "#page-map .ds-map-canvas"))).toBe(true);
  expect(apart(error, await box(page, "#page-map .maplibregl-ctrl-group"))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  expect(await heights()).toHaveLength(1);
});
