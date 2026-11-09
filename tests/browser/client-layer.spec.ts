import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Markup without whitespace, comments or attribute order noise, for parity checks. */
const normalised = (page: Page, selector: string) =>
  page.locator(selector).evaluate((root) => {
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (node.nodeType !== Node.ELEMENT_NODE) return "";
      const el = node as Element;
      const attrs = [...el.attributes]
        .filter((a) => !a.name.startsWith("data-astro") && a.name !== "id" && a.name !== "for")
        .map((a) => `${a.name}=${a.name === "name" ? "" : a.name === "class" ? a.value.split(/\s+/).filter(Boolean).sort().join(" ") : a.value}`)
        .sort()
        .join(" ");
      return `<${el.localName} ${attrs}>${[...el.childNodes].map(walk).filter(Boolean).join("")}</${el.localName}>`;
    };
    // Lit splits text around its (comment) markers; compare the merged text.
    const clone = root.cloneNode(true) as Element;
    const comments = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
    const remove: Node[] = [];
    while (comments.nextNode()) remove.push(comments.currentNode);
    remove.forEach((c) => c.parentNode!.removeChild(c));
    clone.normalize();
    return [...clone.childNodes].map(walk).join("");
  });

test.describe("templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compat/elements");
    await expect(page.locator("html")).toHaveAttribute("data-fixtures-ready", "");
  });

  for (const name of ["feed", "segmented", "tiles", "metrics", "sign", "header", "stat", "properties"]) {
    test(`${name}: server and client render the same markup`, async ({ page }) => {
      expect(await normalised(page, `#client-${name}`)).toBe(await normalised(page, `#server-${name}`));
    });
  }

  test("text is escaped, never parsed as HTML", async ({ page }) => {
    for (const side of ["server", "client"])
      await expect(page.locator(`#${side}-feed .feed-item__title a`)).toHaveText("Hwy 4 <closed> & icy");
  });

  test("radio templates mark the chosen option", async ({ page }) => {
    for (const side of ["server", "client"]) {
      await expect(page.locator(`#${side}-segmented`).getByRole("radio", { name: "°C" })).toBeChecked();
      await expect(page.locator(`#${side}-tiles`).getByRole("radio", { name: /Murphys/ })).toBeChecked();
    }
  });
});

test.describe("elements built in client code", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/compat/elements");
    await expect(page.locator("html")).toHaveAttribute("data-fixtures-ready", "");
  });

  test("createDataDiff matches the server DataDiff and updates with compare()", async ({ page }) => {
    expect(await normalised(page, "#client-diff")).toBe(await normalised(page, "#server-diff sierra-data-diff"));
    await page.locator("#client-diff").evaluate((el: HTMLElement & { compare: Function }) =>
      el.compare({ a: 1, b: "x" }, { a: 2, b: "x", c: null }),
    );
    await expect(page.locator("#client-diff .meta")).toHaveText("2 changes");
    await expect(page.locator("#client-diff li")).toHaveText([/\/a\s*Before:\s*1\s*→\s*After:\s*2/, /\/c\s*Added:\s*\+\s*null/]);
  });

  test("createSelect works by keyboard, and its options and value can be replaced", async ({ page }) => {
    const select = page.locator("sierra-select:has(#client-select)");
    const trigger = page.locator("#client-select");
    await expect(trigger).toHaveText("Murphys");
    await trigger.focus();
    await page.keyboard.press("ArrowUp"); // opens on the current option
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveText("Arnold");
    await expect(select.locator("input[type=hidden]")).toHaveValue("arnold");

    const changes = await select.evaluate(async (el: HTMLElement & { options: unknown; value: string }) => {
      let events = 0;
      el.addEventListener("change", () => events++);
      el.options = [{ value: "sonora", label: "Sonora" }, { value: "arnold", label: "Arnold (updated)" }];
      await Promise.resolve();
      const kept = el.value;
      el.value = "sonora";
      await Promise.resolve();
      return { kept, events };
    });
    expect(changes).toEqual({ kept: "arnold", events: 0 });
    await expect(trigger).toHaveText("Sonora");
    await trigger.click();
    await expect(page.getByRole("option")).toHaveText(["Sonora", "Arnold (updated)"]);
  });

  test("server-rendered Select upgrades to the same API", async ({ page }) => {
    const select = page.locator("sierra-select:has(#server-select)");
    await select.evaluate(async (el: HTMLElement & { value: string }) => {
      el.value = "arnold";
      await Promise.resolve();
    });
    await expect(page.locator("#server-select")).toHaveText("Arnold");
  });

  test("createLineChart renders its own frame and draws", async ({ page }) => {
    const chart = page.locator("#client-chart");
    await expect(chart.locator(".ds-chart__title")).toHaveText("Client chart");
    await expect(chart.locator(".ds-chart__meta")).toHaveText("Values in V · Times in PT");
    await expect.poll(() => chart.evaluate((el: HTMLElement & { chart?: unknown }) => !!el.chart)).toBe(true);
    await chart.evaluate((el: HTMLElement & { props: Record<string, unknown> }) => (el.props = { ...el.props, label: "Renamed", unit: "mV" }));
    await expect(chart.locator(".ds-chart__title")).toHaveText("Renamed");
    await expect(chart.locator(".ds-chart__meta")).toHaveText("Values in mV · Times in PT");
  });
});

test.describe("review regressions", () => {
  test.beforeEach(async ({ page }) => {
    page.on("pageerror", (e) => {
      if (!/listener failure \(expected in tests\)/.test(String(e))) throw e;
    });
    await page.goto("/compat/elements");
    await expect(page.locator("html")).toHaveAttribute("data-fixtures-ready", "");
  });

  test("a sparkline updates through its setter any number of times", async ({ page }) => {
    const spark = page.locator("#early-spark");
    await expect(spark.getByRole("img")).toHaveAttribute("aria-label", /Early: 3 readings, from 1 to 3/);
    for (const values of [[4, 5], [6, 7, 8, 9], [1]]) {
      await spark.evaluate(async (el: HTMLElement & { values: number[] }, v) => {
        el.values = v;
        await Promise.resolve();
      }, values);
      await expect(spark.getByRole("img")).toHaveAttribute("aria-label", new RegExp(`${values.length} reading`));
    }
  });

  test("elements render when props arrive before definition or after attachment", async ({ page }) => {
    await expect(page.locator("#early-spark svg")).toHaveCount(1);
    await expect(page.locator("#late-diff .meta")).toHaveText("1 change");
  });

  test("a region can be created again on a container it used before", async ({ page }) => {
    await expect(page.locator("#reused p")).toHaveText("second");
    await page.evaluate(() => (window as any).reusedStore.set({ text: "third" }));
    await expect(page.locator("#reused p")).toHaveText("third");
  });

  test("keyed moves keep chart instances", async ({ page }) => {
    const charts = page.locator("#moved sierra-line-chart");
    await expect.poll(() => charts.evaluateAll((els) => els.every((e: any) => !!e.chart))).toBe(true);
    await page.evaluate(() => {
      for (const el of document.querySelectorAll<any>("#moved sierra-line-chart")) el.chart.__mark = el.dataset.id;
      (window as any).moveStore.set({ ids: ["b", "a"] });
    });
    await expect(charts.first()).toHaveAttribute("data-id", "b");
    await page.waitForTimeout(50);
    expect(await charts.evaluateAll((els) => els.map((e: any) => e.chart?.__mark))).toEqual(["b", "a"]);
  });

  test("one failing subscriber does not stop the others", async ({ page }) => {
    await page.evaluate(() => (window as any).noisyStore.set({ n: 3 }));
    await expect(page.locator("#counter")).toHaveText("3");
  });
});

test.describe("dashboard regions", () => {
  test("filtering reuses rows, selection updates elements in place, and the URL keeps the view", async ({ page }) => {
    await page.goto("/dashboard");
    const feed = page.locator("#feed-region");
    await expect(feed.locator(".feed-item")).toHaveCount(5);

    // Tag nodes: a re-render that rebuilt them would lose the marks.
    await page.evaluate(() => {
      for (const item of document.querySelectorAll<HTMLElement>("#feed-region .feed-item")) (item as any).__mark = item.querySelector("h2, h3")!.textContent;
      (document.querySelector("#detail-region sierra-data-diff") as any).__mark = "diff";
      (document.querySelector("#weather-region sierra-line-chart") as any).__mark = "chart";
    });

    await feed.getByRole("radio", { name: "Roads" }).check();
    await expect(feed.locator(".feed-item")).toHaveCount(3);
    expect(await page.evaluate(() => [...document.querySelectorAll("#feed-region .feed-item")].map((i) => (i as any).__mark))).toEqual([
      "Hwy 4 closed, Arnold to Bear Valley",
      "Hwy 49 lane closure for drainage work",
      "Hwy 4 one-way traffic control",
    ]);

    await feed.getByRole("link", { name: "Hwy 49 lane closure for drainage work" }).click();
    await expect(feed.locator(".feed-item.is-selected")).toContainText("Hwy 49");
    const detail = page.locator("#detail-region");
    await expect(detail.locator(".card__title")).toHaveText("Hwy 49 lane closure for drainage work");
    await expect(detail.locator("sierra-data-diff .meta")).toHaveText("2 changes");
    expect(await page.evaluate(() => (document.querySelector("#detail-region sierra-data-diff") as any).__mark)).toBe("diff");
    expect(await page.locator("#report-map").evaluate((el: HTMLElement & { selected?: number }) => el.selected)).toBe(2);

    const weather = page.locator("#weather-region");
    await weather.getByRole("radio", { name: "°C" }).check();
    await weather.getByRole("radio", { name: /Bear Valley/ }).check();
    await expect(weather.locator(".reading__value")).toHaveText("2°C");
    await expect(weather.locator(".ds-chart__title")).toHaveText("Next 24 hours, Bear Valley");
    await expect(weather.locator(".ds-chart__meta")).toHaveText("Values in °C · Times in PT");
    expect(await page.evaluate(() => (document.querySelector("#weather-region sierra-line-chart") as any).__mark)).toBe("chart");

    expect(new URL(page.url()).search).toBe("?category=roads&report=hwy49-drainage&station=bear-valley&unit=c");
    await page.reload();
    await expect(feed.locator(".feed-item")).toHaveCount(3);
    await expect(detail.locator(".card__title")).toHaveText("Hwy 49 lane closure for drainage work");
    await expect(weather.locator(".reading__value")).toHaveText("2°C");
  });

  test("selecting a marker selects the report, even when filtered out", async ({ page }) => {
    await page.goto("/dashboard");
    const feed = page.locator("#feed-region");
    await feed.getByRole("radio", { name: "Wildfires" }).check();
    await expect(feed.locator(".feed-item")).toHaveCount(1);
    // The same path as a click on a marker or its label.
    await page.locator("#report-map").evaluate((el: HTMLElement & { select(i: number): void }) => el.select(2));
    await expect(feed.locator(".feed-item.is-selected")).toContainText("Hwy 49 lane closure");
    await expect(feed.getByRole("radio", { name: "All" })).toBeChecked();
    await expect(page.locator("#detail-region .card__title")).toHaveText("Hwy 49 lane closure for drainage work");
    // The page lists the reports already, so the map's own button list is off.
    await expect(page.locator("#report-map .ds-map-feature-list")).toHaveCount(0);
  });

  test("badges on the summary banner use the deep-ground treatment", async ({ page }) => {
    await page.goto("/dashboard");
    const badge = page.locator(".summary-banner .badge").first();
    const colours = await badge.evaluate((el) => {
      const banner = getComputedStyle(el.closest(".summary-banner")!);
      return { text: getComputedStyle(el).color, ink: banner.color };
    });
    expect(colours.text).toBe(colours.ink);
  });

  test("a click anywhere on a feed row selects it; the link stays the keyboard path", async ({ page }) => {
    await page.goto("/dashboard");
    const row = page.locator("#feed-region .feed-item", { hasText: "Wind advisory" });
    // Click the place line, away from the title: the row's link covers the whole row.
    const place = await row.locator(".feed-item__place").boundingBox();
    const box = await row.boundingBox();
    await row.click({ position: { x: place!.x - box!.x + 10, y: place!.y - box!.y + place!.height / 2 } });
    await expect(row).toHaveClass(/is-selected/);
    await expect(row.getByRole("link")).toHaveAttribute("aria-current", "true");
    await expect(page).toHaveURL(/\/dashboard\?report=wind-advisory$/);
    await expect(page.getByRole("status").filter({ hasText: "of 5 reports" })).toHaveText("5 of 5 reports");
  });

  test("choosing a report highlights it on the map", async ({ page }) => {
    await page.goto("/dashboard");
    await page.locator("#feed-region").getByRole("link", { name: "Wind advisory above 6,000 ft" }).click();
    await expect.poll(() => page.locator("#report-map").evaluate((el: HTMLElement & { selected?: number }) => el.selected)).toBe(3);
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`dashboard has no axe violations in ${scheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/dashboard");
      const results = await new AxeBuilder({ page }).include(".dashboard").exclude(".maplibregl-map").analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
    });
  }

  test("the dashboard does not scroll sideways on a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dashboard");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe("app navigation", () => {
  const log = (page: Page) => page.evaluate(() => (window as unknown as { navLog: string[] }).navLog);

  test("pages mount on every visit, clean up on leave, and keep URL state across back", async ({ page }) => {
    await page.goto("/client-router");
    await expect.poll(() => log(page)).toEqual(["mount:first"]);
    await expect(page.locator("#tab")).toHaveText("a");
    await expect(page.getByRole("link", { name: "First" })).toHaveAttribute("aria-current", "page");

    await page.evaluate(() => (window as any).tabs.set({ tab: "b" }));
    await expect(page.locator("#tab")).toHaveText("b");
    await expect(page).toHaveURL(/\/client-router\?tab=b$/);

    await page.evaluate(() => ((window as any).sameWindow = true));
    await page.locator("#client-nav").click();
    await expect(page).toHaveURL(/\/client-router\/next$/);
    await expect.poll(() => log(page)).toEqual(["mount:first", "leave:first", "mount:next"]);
    await expect(page.getByRole("link", { name: "Second" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "First" })).not.toHaveAttribute("aria-current", "page");

    await page.goBack();
    await expect(page).toHaveURL(/\/client-router\?tab=b$/);
    await expect.poll(() => log(page)).toEqual(["mount:first", "leave:first", "mount:next", "leave:next", "mount:first"]);
    await expect(page.locator("#tab")).toHaveText("b");
    expect(await page.evaluate(() => (window as any).sameWindow)).toBe(true);
  });
});
