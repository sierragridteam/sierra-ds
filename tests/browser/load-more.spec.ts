import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/compat/load-more");
  await expect(page.locator("html")).toHaveAttribute("data-fixtures-ready", "");
});

test("loads the next page as the end of a scrolling column comes near", async ({ page }) => {
  const rows = page.locator("#column-list li");
  // The first page loads on its own (the empty column shows the sentinel).
  await expect(rows).toHaveCount(10);
  await page.locator("#column").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(rows).toHaveCount(20);
  await page.locator("#column").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(rows).toHaveCount(30);
  await page.locator("#column").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(rows).toHaveCount(40);
  await expect(page.locator("#column-more")).toContainText("All rows loaded.");
  await expect(page.locator("#column-more button")).toHaveCount(0);
});

test("a short page that leaves the sentinel in view keeps loading", async ({ page }) => {
  await expect(page.locator("#short-list li")).toHaveCount(3);
  expect(await page.evaluate(() => (window as any)["short-moreCalls"])).toBe(3);
});

test("an error stops automatic loading; the button retries", async ({ page }) => {
  const rows = page.locator("#fail-list li");
  await page.locator("#fail-more").scrollIntoViewIfNeeded();
  await expect(page.locator("#fail-more")).toContainText("That page could not load.");
  const calls = await page.evaluate(() => (window as any)["fail-moreCalls"]);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any)["fail-moreCalls"])).toBe(calls); // no retry loop
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(rows).toHaveCount(15);
});

test("auto: false leaves loading to the button", async ({ page }) => {
  await page.locator("#manual-more").scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await expect(page.locator("#manual-list li")).toHaveCount(0);
  await page.getByRole("button", { name: "Load more manual" }).click();
  await expect(page.locator("#manual-list li")).toHaveCount(2);
});

test("one scroll to the end loads one page, not a burst", async ({ page }) => {
  // The column fixture loads 40px ahead; one page adds 400px, which puts the
  // end out of reach. The re-check after a page must measure, not reuse the
  // observer's last reading (which predates the new rows).
  const rows = page.locator("#column-list li");
  await expect(rows).toHaveCount(10);
  await page.locator("#column").evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(rows).toHaveCount(20);
  await page.waitForTimeout(500);
  await expect(rows).toHaveCount(20);
  expect(await page.evaluate(() => (window as any)["column-moreCalls"])).toBe(2);
});
