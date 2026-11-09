import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type ChartLike = HTMLElement & {
  chart?: {
    data: { datasets: { borderColor?: string; backgroundColor?: string; data: unknown[] }[] };
    isDatasetVisible(i: number): boolean;
    options: { scales: { x: { min?: number; max?: number } } };
  };
};

const colors = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el: ChartLike) =>
    el.chart!.data.datasets.map((d) => d.borderColor),
  );

test("line, bar and sparkline charts render without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/charts");
  await expect(page.locator("sierra-line-chart")).toHaveCount(3);
  await expect(page.locator("sierra-bar-chart")).toHaveCount(5);
  for (const el of await page.locator("sierra-line-chart, sierra-bar-chart").all())
    await expect
      .poll(() => el.evaluate((e: ChartLike) => !!e.chart))
      .toBe(true);
  await expect(page.locator("sierra-sparkline svg")).toHaveCount(7);
  expect(errors).toEqual([]);
});

test("the canvas has a text summary and the data table is server-rendered", async ({ page }) => {
  await page.goto("/charts");
  const chart = page.locator("#battery-chart");
  await expect(chart.locator("canvas")).toHaveAttribute(
    "aria-label",
    /^Node battery voltage, line chart from .+ PT\. Ebbetts Pass relay: latest [\d.]+ V, low/,
  );
  await chart.getByText("View data table").click();
  const table = chart.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveText([
    "Time (PT)",
    "Ebbetts Pass relay",
    "Arnold repeater",
    "Bear Valley node",
  ]);
  // The relay's overnight gap shows as an em dash, not an invented reading.
  await expect(table.getByRole("cell", { name: "—" }).first()).toBeVisible();
});

test("legend keys toggle a series and keep the others' colours", async ({ page }) => {
  await page.goto("/charts");
  const chart = page.locator("#battery-chart");
  const before = await colors(page, "#battery-chart");
  const key = chart.getByRole("button", { name: "Arnold repeater" });
  await expect(key).toHaveAttribute("aria-pressed", "true");
  await key.click();
  await expect(key).toHaveAttribute("aria-pressed", "false");
  await expect(key).toBeFocused();
  expect(await chart.evaluate((e: ChartLike) => e.chart!.isDatasetVisible(1))).toBe(false);
  expect(await colors(page, "#battery-chart")).toEqual(before);
  await page.keyboard.press("Enter");
  await expect(key).toHaveAttribute("aria-pressed", "true");
});

test("series follow the palette order and recolour with the theme", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/charts");
  await expect.poll(() => colors(page, "#battery-chart")).toEqual(["#036eae", "#ab8000", "#b7376b"]);
  await page.locator(".demo-header").getByRole("radio", { name: "Dark" }).check();
  await expect.poll(() => colors(page, "#battery-chart")).toEqual(["#3e8cc9", "#b48c2b", "#c24976"]);
  // Sparklines are SVG and theme through CSS alone.
  await expect(page.locator("#packets-spark .ds-sparkline__line")).toHaveCSS("stroke", "rgb(76, 165, 99)");
});

test("live charts append samples inside a moving window", async ({ page }) => {
  await page.goto("/charts");
  const live = page.locator("#live-chart");
  await page.getByRole("button", { name: "Pause updates" }).click();
  const result = await live.evaluate((el: ChartLike & { appendPoints: Function; series: { points: { time: number }[] }[] }) => {
    const newest = Math.max(...el.series[0].points.map((p) => p.time));
    el.appendPoints("heard", [{ time: newest + 60_000, value: 120 }], { windowMs: 5 * 60_000 });
    return {
      domain: [el.chart!.options.scales.x.min, el.chart!.options.scales.x.max],
      expected: [newest + 60_000 - 5 * 60_000, newest + 60_000],
      oldest: Math.min(...el.series[0].points.map((p) => p.time)),
    };
  });
  expect(result.domain).toEqual(result.expected);
  expect(result.oldest).toBeGreaterThanOrEqual(result.expected[0]);
  await expect(page.getByRole("button", { name: "Resume updates" })).toHaveAttribute("aria-pressed", "false");
});

test("sparklines update through their values property", async ({ page }) => {
  await page.goto("/charts");
  const spark = page.locator("#packets-spark");
  await spark.evaluate((el: HTMLElement & { values: number[] }) => (el.values = [1, 2, 3]));
  await expect(spark.getByRole("img")).toHaveAttribute(
    "aria-label",
    "Packets per minute, last 24 hours: 3 readings, from 1 to 3; low 1, high 3.",
  );
});

test("an empty chart says so instead of drawing axes", async ({ page }) => {
  await page.goto("/charts");
  const live = page.locator("#live-chart");
  await live.evaluate((el: HTMLElement & { series: unknown[] }) => (el.series = [{ id: "x", label: "X", points: [] }]));
  await expect(live.getByText("No readings for this period.")).toBeVisible();
  await expect(live.locator("[data-chart-frame]")).toBeHidden();
});

for (const scheme of ["light", "dark"] as const) {
  test(`charts page has no axe violations in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/charts");
    await page.locator("details.ds-chart__data").first().evaluate((d: HTMLDetailsElement) => (d.open = true));
    const results = await new AxeBuilder({ page }).include(".charts-demo").exclude("#svg").analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
  });
}
