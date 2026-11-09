import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHART_COLORS,
  barTable,
  buildBarModel,
  buildLineModel,
  buildSparkline,
  describeBars,
  describeLine,
  formatAxisValue,
  formatChartTime,
  formatChartValue,
  isolatedPoints,
  lineTable,
  seriesColor,
  timeTicks,
  zoneOffset,
} from "../packages/design-system/src/lib/chart-model.ts";

const HOUR = 3_600_000;
const PT = "America/Los_Angeles";

// ---------------------------------------------------------------------------
// Palette: read the tokens and hold them to the categorical checks.

const css = readFileSync(
  new URL("../packages/design-system/src/styles/tokens.css", import.meta.url),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");
function block(selector) {
  const escaped = selector.replace(/[[\]().*+?^$|\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  const match = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(match, `missing ${selector}`);
  return new Map([...match[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const themes = {
  light: block(':root, [data-theme="light"], [data-theme="system"]'),
  dark: block('[data-theme="dark"]'),
};

const srgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = srgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Machado, Oliveira & Fernandes (2009), severity 1.0, applied in linear RGB.
const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
};
const oklab = ([r, g, b]) => {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
};
const simulate = (hex, kind) => {
  const rgb = srgb(hex).map(linear);
  if (!kind) return rgb;
  return CVD[kind].map((row) => Math.min(1, Math.max(0, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
};
const deltaE = (a, b, kind) => {
  const [x, y] = [oklab(simulate(a, kind)), oklab(simulate(b, kind))];
  return 100 * Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
};

for (const [name, theme] of Object.entries(themes)) {
  const palette = CHART_COLORS.map((c) => theme.get(`--chart-${c}`));
  test(`${name} chart palette: every series colour clears 3:1 on page and card`, () => {
    for (const surface of ["--surface-page", "--surface-card", "--surface-raised"])
      for (const [i, color] of palette.entries())
        assert.ok(contrast(color, theme.get(surface)) >= 3, `${name} ${CHART_COLORS[i]} on ${surface}`);
    assert.ok(contrast(theme.get("--chart-other"), theme.get("--surface-card")) >= 3, "other");
  });
  test(`${name} chart palette: neighbours stay distinct, including under red–green CVD`, () => {
    for (let i = 1; i < palette.length; i++) {
      const [a, b] = [palette[i - 1], palette[i]];
      const pair = `${CHART_COLORS[i - 1]}/${CHART_COLORS[i]}`;
      assert.ok(deltaE(a, b) >= 15, `${name} ${pair} normal ΔE ${deltaE(a, b).toFixed(1)}`);
      for (const kind of ["protan", "deutan"])
        assert.ok(deltaE(a, b, kind) >= 8, `${name} ${pair} ${kind} ΔE ${deltaE(a, b, kind).toFixed(1)}`);
    }
  });
  test(`${name} chart palette: the first three are distinct in any combination`, () => {
    const first = palette.slice(0, 3);
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++) {
        assert.ok(deltaE(first[i], first[j]) >= 15);
        for (const kind of ["protan", "deutan"]) assert.ok(deltaE(first[i], first[j], kind) >= 8);
      }
  });
}

// ---------------------------------------------------------------------------
// Models

test("series take palette slots in order, keep explicit colours and fall back to other", () => {
  assert.deepEqual([0, 1, 5, 6, 9].map((i) => seriesColor(i)), ["lake", "ochre", "pine", "other", "other"]);
  assert.equal(seriesColor(0, "pine"), "pine");
  assert.equal(seriesColor(2, "nonsense"), "manzanita");
});

test("line model sorts samples, keeps nulls and breaks lines across long gaps", () => {
  const model = buildLineModel({
    label: "Battery",
    maxGapMs: 30 * 60_000,
    series: [{ id: "a", label: "A", points: [
      { time: 2 * HOUR, value: 3.7 },
      { time: 0, value: 3.6 },
      { time: HOUR / 4, value: Number.NaN },
      { time: HOUR / 2, value: 3.65 },
      { time: Number.POSITIVE_INFINITY, value: 1 },
    ] }],
  });
  assert.deepEqual(model.series[0].plot, [
    { x: 0, y: 3.6 },
    { x: HOUR / 4, y: null },
    { x: HOUR / 2, y: 3.65 },
    { x: HOUR * 1.25, y: null },
    { x: 2 * HOUR, y: 3.7 },
  ]);
  assert.deepEqual(model.timeDomain, [0, 2 * HOUR]);
  assert.equal(model.empty, false);
  // Both remaining samples are islands between breaks and need a dot.
  assert.deepEqual(isolatedPoints(model.series[0].plot), [0, 2, 4]);
});

test("line model rejects duplicate ids and bad domains", () => {
  const series = [{ id: "a", label: "A", points: [] }];
  assert.throws(() => buildLineModel({ label: "x", series: [...series, ...series] }), /unique/);
  assert.throws(() => buildLineModel({ label: "x", series, valueDomain: [2, 1] }), RangeError);
  assert.throws(() => buildLineModel({ label: "x", series, maxGapMs: 0 }), RangeError);
  assert.equal(buildLineModel({ label: "x", series }).empty, true);
});

test("bar model normalises ranges and refuses stacked ranges", () => {
  const model = buildBarModel({
    label: "Temperature",
    categories: ["Mon", "Tue", "Wed"],
    series: [{ id: "t", label: "Temp", values: [[60, 40], null] }],
  });
  assert.deepEqual(model.series[0].values, [[40, 60], null, null]);
  assert.equal(model.range, true);
  assert.throws(() => buildBarModel({ label: "x", stacked: true, categories: ["a"], series: [{ id: "t", label: "T", values: [[1, 2]] }] }), /stacked/);
  assert.throws(() => buildBarModel({ label: "x", categories: ["a"], series: [{ id: "t", label: "T", values: [1, 2] }] }), RangeError);
});

// ---------------------------------------------------------------------------
// Formatting and time

test("values format with units and house conventions", () => {
  assert.equal(formatChartValue(3.456, { unit: "V", decimals: 2 }), "3.46 V");
  assert.equal(formatChartValue(41, { unit: "°F" }), "41°F");
  assert.equal(formatChartValue(null, { unit: "V" }), "Not reported");
  assert.equal(formatAxisValue(1500, 2000), "1,500");
  assert.equal(formatAxisValue(25000, 40000), "25K");
  assert.equal(formatAxisValue(3.25, 0.5), "3.25");
});

test("times use a 24-hour Pacific clock", () => {
  assert.equal(formatChartTime(Date.UTC(2026, 10, 9, 21, 5), PT), "Mon 9 Nov, 13:05");
  assert.equal(formatChartTime(Date.UTC(2026, 6, 4, 2, 0), PT), "Fri 3 Jul, 19:00");
  assert.equal(zoneOffset(Date.UTC(2026, 6, 1), PT), -7 * HOUR);
  assert.equal(zoneOffset(Date.UTC(2026, 11, 1), PT), -8 * HOUR);
});

test("time ticks land on local clock boundaries and mark midnight", () => {
  // 18:00 PT to 06:00 PT next day.
  const ticks = timeTicks(Date.UTC(2026, 10, 10, 2), Date.UTC(2026, 10, 10, 14), { timeZone: PT, maxTicks: 5 });
  assert.deepEqual(ticks.map((t) => t.label), ["18:00", "21:00", "10 Nov", "03:00", "06:00"]);
  assert.deepEqual(ticks.map((t) => t.major), [false, false, true, false, false]);
});

test("time ticks follow the wall clock through the end of daylight saving", () => {
  // 1 Nov 2026: 02:00 PDT falls back to 01:00 PST.
  const ticks = timeTicks(Date.UTC(2026, 10, 1, 7), Date.UTC(2026, 10, 1, 20), { timeZone: PT, maxTicks: 6 });
  assert.deepEqual(ticks.map((t) => t.label), ["1 Nov", "03:00", "06:00", "09:00", "12:00"]);
  assert.equal(ticks[1].value - ticks[0].value, 4 * HOUR);
});

test("daily ticks are local midnights", () => {
  const ticks = timeTicks(Date.UTC(2026, 10, 2, 12), Date.UTC(2026, 10, 6, 12), { timeZone: PT, maxTicks: 6 });
  assert.deepEqual(ticks.map((t) => t.label), ["3 Nov", "4 Nov", "5 Nov", "6 Nov"]);
  for (const t of ticks) assert.equal(new Date(t.value).getUTCHours(), 8);
});

// ---------------------------------------------------------------------------
// Text alternatives

test("line table is wide by time and summary states latest, low and high", () => {
  const model = buildLineModel({
    label: "Battery",
    unit: "V",
    timeZone: "UTC",
    series: [
      { id: "a", label: "Relay A", points: [{ time: 0, value: 3.6 }, { time: HOUR, value: 3.8 }] },
      { id: "b", label: "Relay B", points: [{ time: HOUR, value: null }] },
    ],
  });
  assert.deepEqual(lineTable(model), {
    caption: "Battery (V), times in UTC",
    columns: ["Time (UTC)", "Relay A", "Relay B"],
    rows: [
      ["Thu 1 Jan, 00:00", "3.6", "—"],
      ["Thu 1 Jan, 01:00", "3.8", "Not reported"],
    ],
  });
  assert.equal(
    describeLine(model),
    "Battery, line chart from Thu 1 Jan, 00:00 to Thu 1 Jan, 01:00 UTC. Relay A: latest 3.8 V, low 3.6 V, high 3.8 V; Relay B: no readings.",
  );
});

test("bar table and summary cover ranges", () => {
  const model = buildBarModel({
    label: "Temperature",
    unit: "°F",
    categoryLabel: "Day",
    categories: ["Mon", "Tue"],
    series: [{ id: "t", label: "Range", values: [[30, 52], [35, 48]] }],
  });
  assert.deepEqual(barTable(model).rows, [["Mon", "30–52"], ["Tue", "35–48"]]);
  assert.equal(barTable(model).columns[0], "Day");
  assert.equal(
    describeBars(model),
    "Temperature, bar chart of 2 categories. Range: highest 52°F (Mon), lowest 30°F (Mon).",
  );
});

test("sparkline geometry breaks on nulls, ends with a dot and describes the range", () => {
  const line = buildSparkline({ label: "Temp", values: [1, 3, null, 2], width: 100, height: 20, unit: "°F" });
  assert.equal(line.path, "M4 16L34.67 4M96 10");
  assert.deepEqual(line.last, { x: 96, y: 10 });
  assert.equal(line.description, "Temp: 3 readings, from 1°F to 2°F; low 1°F, high 3°F.");
  const bars = buildSparkline({ label: "Rain", values: [0, 1, null, 0.5], variant: "bar", width: 40, height: 10 });
  assert.equal(bars.bars.length, 3);
  assert.equal(bars.bars[1].height, 10);
  assert.equal(buildSparkline({ label: "None", values: [] }).description, "None: no readings.");
});
