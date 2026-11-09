import { test, expect } from "@playwright/test";

// A section header's title keeps its line; a description of any length sits beneath it.
for (const width of [1280, 390]) {
  test(`section header descriptions sit below the title at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/charts");
    const header = page.locator("#telemetry .section-header");
    const [title, text] = await Promise.all([
      header.locator("h2").boundingBox(),
      header.locator("p").boundingBox(),
    ]);
    expect(text!.y).toBeGreaterThanOrEqual(title!.y + title!.height - 1);
    expect(Math.round(text!.x)).toBe(Math.round(title!.x));
    // The title is one line, not squeezed into a column.
    expect(title!.height).toBeLessThan(40);
  });
}
