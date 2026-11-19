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

test("the data table copies as Markdown and the icon confirms with a tick", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/charts");
  const chart = page.locator("sierra-bar-chart").filter({ hasText: "Rainfall by station" });
  await chart.getByText("View data table").click();
  const copy = chart.getByRole("button", { name: "Copy table as Markdown" });
  await expect(copy.locator("[data-copy-icon]")).toBeVisible();
  await copy.click();
  await expect(copy.locator("[data-copy-check]")).toBeVisible();
  await expect(copy.locator("[data-copy-icon]")).toBeHidden();
  await expect(chart.getByRole("status")).toHaveText("Copied.");
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text.split("\n").slice(0, 5)).toEqual([
    "**Rainfall by station (in)**",
    "",
    "| Station | Storm total |",
    "| --- | ---: |",
    "| Ebbetts Pass | 2.41 |",
  ]);
  await expect(copy.locator("[data-copy-icon]")).toBeVisible({ timeout: 4000 });
});

test("copied Markdown follows live data", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/charts");
  const live = page.locator("#live-chart");
  await page.getByRole("button", { name: "Pause updates" }).click();
  await live.getByText("View data table").click();
  await live.evaluate((el: HTMLElement & { series: unknown[] }) => {
    el.series = [{ id: "h", label: "Heard", points: [{ time: Date.UTC(2026, 10, 9, 20), value: 42 }] }];
  });
  await live.getByRole("button", { name: "Copy table as Markdown" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("| Mon 9 Nov, 12:00 | 42 |");
});

test("repeated clicks on the table toggle never select text", async ({ page }) => {
  await page.goto("/charts");
  const summary = page.locator("#battery-chart summary");
  await expect(summary).toHaveCSS("user-select", "none");
  await summary.dblclick();
  await summary.click({ clickCount: 3 });
  expect(await page.evaluate(() => getSelection()?.toString() ?? "")).toBe("");
});

test("open data tables scroll inside the chart, not the page, on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/charts");
  for (const details of await page.locator("details.ds-chart__data").all())
    await details.evaluate((d: HTMLDetailsElement) => (d.open = true));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

// Chart.js parks a resize that arrives while it animates and applies it on its next draw.
// The frame that takes the last animation step is followed by no draw, so a resize handled
// in that frame stayed parked: either the canvas kept its old width, or a later resize was
// undone when its own draw replayed the parked one. Both need one exact frame order, so the
// clock is held and the frames are stepped by hand.
const FRAME = 16;
const resized = (page: Page, width?: number) =>
  page.evaluate(
    (width) =>
      new Promise<void>((resolve) => {
        if (width) document.getElementById("resize-host")!.style.width = `${width}px`;
        // Chart.js observes the same box and was there first, so it has been told by now.
        const observer = new ResizeObserver(() => (observer.disconnect(), resolve()));
        observer.observe(document.querySelector("#resize-host [data-chart-frame]")!);
      }),
    width,
  );

for (const order of ["on the last animated frame", "after a resize parked on the last animated frame"] as const) {
  test(`a chart follows its container when it narrows ${order}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.clock.install({ time: new Date("2026-01-01T08:00:00Z") });
    await page.goto("/charts");
    await expect.poll(() => page.evaluate(() => !!customElements.get("sierra-bar-chart"))).toBe(true);
    await page.clock.pauseAt(new Date("2026-01-01T08:10:00Z"));
    // Built inside a frame, so the opening animation starts on the frame grid.
    await page.evaluate(() => {
      const host = document.createElement("div");
      host.id = "resize-host";
      host.style.width = "640px";
      document.querySelector("main")!.append(host);
      const chart = document.createElement("sierra-bar-chart") as HTMLElement & { options: unknown };
      chart.options = {
        label: "Customers affected, by week",
        categories: ["1 Nov", "8 Nov", "15 Nov"],
        series: [{ id: "outages", label: "Outages", values: [120, 40, 310] }],
      };
      requestAnimationFrame(() => host.append(chart));
    });
    await page.clock.runFor(FRAME);
    const canvas = page.locator("#resize-host canvas");
    await expect(canvas).toHaveCSS("width", "640px");
    const duration = await page
      .locator("#resize-host sierra-bar-chart")
      .evaluate((el: HTMLElement & { chart: { options: { animation: { duration: number } } } }) => el.chart.options.animation.duration);
    expect(duration).toBeGreaterThan(FRAME);
    // The observer's first report (the size the chart already has) is queued for the next frame.
    await resized(page);
    if (order === "on the last animated frame") {
      // Every frame but the last, then the container narrows: the resize runs after the last step.
      await page.clock.runFor((Math.ceil(duration / FRAME) - 1) * FRAME);
      await resized(page, 320);
      await page.clock.runFor(FRAME);
    } else {
      // A busy page: the next frame comes after the animation's end, takes its last step and
      // parks the first report. The container narrows afterwards.
      await page.clock.fastForward(duration + 150);
      await resized(page, 320);
    }
    await page.clock.runFor(1000);
    await expect(page.locator("#resize-host [data-chart-frame]")).toHaveCSS("width", "320px");
    await expect(canvas).toHaveCSS("width", "320px");
  });
}
