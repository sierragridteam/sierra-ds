import { test, expect } from "@playwright/test";

// TimeSeriesChart is deprecated but keeps its 0.6 API on top of LineChart.
const PAGE = "/compat/time-series";

test("the wrapper keeps its element, UTC labels, zero and missing values", async ({ page }) => {
  await page.goto(PAGE);
  const chart = page.locator("sierra-time-series#demo-chart");
  await expect(chart.locator("canvas[role=img]")).toHaveAttribute("aria-label", /UTC\. Synthetic receiver A: latest 7 dB/);
  await expect(chart).toContainText("Values in dB · Times in UTC");
  await chart.getByText("View data table").click();
  const table = chart.getByRole("table");
  await expect(table.getByRole("columnheader").first()).toHaveText("Time (UTC)");
  await expect(table.getByRole("cell", { name: "Not reported", exact: true })).toHaveCount(1);
  await expect(table.getByRole("cell", { name: "0", exact: true })).toHaveCount(1);
});

test("series and options setters update the chart and table", async ({ page }) => {
  await page.goto(PAGE);
  const chart = page.locator("#demo-chart");
  await chart.getByText("View data table").click();
  await page.getByRole("button", { name: "Replace with one zero reading" }).click();
  const table = chart.getByRole("table");
  await expect(table.getByRole("columnheader")).toHaveText(["Time (UTC)", "Updated sample"]);
  await expect(table.getByRole("cell", { name: "0", exact: true })).toHaveCount(1);
  await page.evaluate(() => ((document.querySelector("#demo-chart") as any).series = []));
  await expect(chart.getByText("No readings for this period.")).toBeVisible();
  await expect(chart.locator("canvas")).toBeHidden();
});

test("invalid update leaves previous chart and options intact", async ({ page }) => {
  await page.goto(PAGE);
  const rejected = await page.evaluate(() => {
    const el = document.querySelector("#demo-chart") as any;
    try {
      el.options = { ...el.options, valueDomain: [0, 0] };
      return false;
    } catch {
      return el.options.valueDomain === undefined && el.chart.data.datasets.length === 2;
    }
  });
  expect(rejected).toBe(true);
});

test("narrow layouts do not overflow and the table opens by keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PAGE);
  await page.locator("#demo-chart summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#demo-chart table")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("sample values remain available without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:4329${PAGE}`);
  await page.locator("#demo-chart summary").click();
  await expect(page.locator("#demo-chart").getByRole("cell", { name: "Not reported", exact: true })).toBeVisible();
  await context.close();
});
