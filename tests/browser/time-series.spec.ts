import { test, expect } from "@playwright/test";
test("updates SVG and accessible values together; preserves zero and missing", async ({
  page,
}) => {
  await page.goto("/charts");
  const chart = page.locator("#demo-chart");
  await expect(chart.locator("svg[role=img]")).toHaveCount(1);
  await chart.getByText("View data table").click();
  await expect(
    chart.getByRole("cell", { name: "Not reported", exact: true }),
  ).toHaveCount(1);
  await expect(chart.getByRole("cell", { name: "0", exact: true })).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "Replace with one zero reading" })
    .click();
  await expect(chart.locator(".ds-chart-dot")).toHaveCount(1);
  await expect(
    chart.getByRole("cell", { name: "Updated sample", exact: true }),
  ).toHaveCount(1);
  await expect(chart.getByRole("cell", { name: "0", exact: true })).toHaveCount(
    1,
  );
  await expect(
    chart.getByRole("cell", { name: "Not reported", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    const chart = document.querySelector("#demo-chart") as any;
    chart.series = [];
  });
  await expect(chart.locator("svg")).toHaveCount(0);
  await expect(
    chart.getByText("No numeric samples.", { exact: false }),
  ).toBeVisible();
});
test("narrow layouts do not overflow and table disclosure works by keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/charts");
  const summary = page.locator("#demo-chart summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#demo-chart table")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("invalid update leaves previous chart and options intact", async ({
  page,
}) => {
  await page.goto("/charts");
  await expect(page.locator("#demo-chart svg[role=img]")).toHaveCount(1);
  const rejected = await page.evaluate(() => {
    const el = document.querySelector("#demo-chart") as any;
    try {
      el.options = { ...el.options, valueDomain: [0, 0] };
      return false;
    } catch {
      return el.options.valueDomain === undefined;
    }
  });
  expect(rejected).toBe(true);
  await expect(page.locator("#demo-chart svg[role=img]")).toHaveCount(1);
});

test("sample values remain available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4329/charts");
  await page.locator("#demo-chart summary").click();
  await expect(
    page
      .locator("#demo-chart")
      .getByRole("cell", { name: "Not reported", exact: true }),
  ).toBeVisible();
  await context.close();
});
