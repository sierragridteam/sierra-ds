import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("visible logo words occur naturally in its accessible home link name", async ({
  page,
}) => {
  await page.goto("/logos");
  for (const [id, name] of [
    ["default", "S.I.E.R.R.A Members home"],
    ["grid", "S.I.E.R.R.A Grid home"],
    ["multiword", "S.I.E.R.R.A Data explorer home"],
    ["empty", "S.I.E.R.R.A home"],
    ["mark", "S.I.E.R.R.A Grid home"],
  ]) {
    await expect(page.locator(`#logo-${id} a`)).toHaveAccessibleName(name);
  }
  const results = await new AxeBuilder({ page })
    .include(".logo")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(
    results.passes.some(
      (result) => result.id === "label-content-name-mismatch",
    ),
  ).toBe(true);
});

test("site wordmark remains stacked after adding its natural text separator", async ({
  page,
}) => {
  await page.goto("/logos");
  const logo = page.locator("#logo-grid");
  await expect(logo.locator(".logo__text")).toHaveText("S.I.E.R.R.A Grid");
  const org = await logo.locator(".logo__org").boundingBox();
  const app = await logo.locator(".logo__app").boundingBox();
  expect(org).not.toBeNull();
  expect(app).not.toBeNull();
  expect(app!.y).toBeGreaterThanOrEqual(org!.y + org!.height - 1);
  expect(app!.x).toBeCloseTo(org!.x, 0);
});
