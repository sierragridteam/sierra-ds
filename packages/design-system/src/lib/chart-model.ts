/**
 * Pure chart models shared by the Astro components (server render) and the
 * Chart.js runtime (browser). No DOM or Chart.js imports, so the data rules —
 * colour assignment, gaps, time ticks, tables and text summaries — are tested
 * without a browser.
 */

/** Fixed categorical order. The order is the colour-vision safety mechanism: never cycle or reorder. */
export const CHART_COLORS = [
  "lake",
  "ochre",
  "manzanita",
  "glacier",
  "lupine",
  "pine",
] as const;
export type ChartColor = (typeof CHART_COLORS)[number] | "other";

export function isChartColor(value: unknown): value is ChartColor {
  return (
    value === "other" ||
    (CHART_COLORS as readonly unknown[]).includes(value)
  );
}

/**
 * Colour for the series at `index`. An explicit colour wins, so an entity keeps
 * its colour when filters change the series count. Past the sixth slot, series
 * fall back to the recessive `other` colour instead of inventing a hue.
 */
export function seriesColor(index: number, explicit?: ChartColor): ChartColor {
  if (explicit && isChartColor(explicit)) return explicit;
  return CHART_COLORS[index] ?? "other";
}

export const chartColorVar = (color: ChartColor) => `--chart-${color}`;

export const DEFAULT_TIME_ZONE = "America/Los_Angeles";

export interface ChartThreshold {
  value: number;
  label: string;
}

export interface LinePoint {
  time: number;
  value: number | null;
}
export interface LineSeries {
  id: string;
  label: string;
  points: LinePoint[];
  color?: ChartColor;
  /** A 10% wash under the line. Use for a single series; never stack washes. */
  area?: boolean;
}
export interface LineChartOptions {
  label: string;
  description?: string;
  series: LineSeries[];
  unit?: string;
  /** IANA zone for labels; samples stay epoch milliseconds. Defaults to Pacific time. */
  timeZone?: string;
  timeDomain?: [number, number];
  valueDomain?: [number, number];
  /** Start the value axis at zero (counts, rates). */
  zero?: boolean;
  /** Break a line when consecutive samples are further apart than this. */
  maxGapMs?: number;
  thresholds?: ChartThreshold[];
  /** Fraction digits for values in tooltips, tables and summaries. */
  decimals?: number;
  /** Plot height in px. */
  height?: number;
}

export type BarValue = number | null | [number, number];
export interface BarSeries {
  id: string;
  label: string;
  values: BarValue[];
  color?: ChartColor;
}
export interface BarChartOptions {
  label: string;
  description?: string;
  categories: string[];
  series: BarSeries[];
  unit?: string;
  stacked?: boolean;
  /** Bars grow left to right; use for long category names. */
  horizontal?: boolean;
  valueDomain?: [number, number];
  thresholds?: ChartThreshold[];
  decimals?: number;
  height?: number;
  /** Heading for the category column of the data table. */
  categoryLabel?: string;
}

export interface SparklineOptions {
  /** Accessible name, e.g. "Temperature, last 24 hours". */
  label: string;
  values: (number | null)[];
  unit?: string;
  color?: ChartColor;
  variant?: "line" | "bar";
  decimals?: number;
  width?: number;
  height?: number;
}

// ---------------------------------------------------------------------------
// Validation and normalisation

function assertUniqueIds(series: { id: string }[]) {
  const ids = new Set<string>();
  for (const s of series) {
    if (ids.has(s.id)) throw new Error(`Series IDs must be unique: ${s.id}`);
    ids.add(s.id);
  }
}

function assertDomain(domain: [number, number] | undefined, name: string) {
  if (
    domain &&
    (!domain.every(Number.isFinite) || domain[0] >= domain[1])
  )
    throw new RangeError(`${name} must be finite and increasing`);
}

const finite = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

/** One plotted vertex: `y: null` breaks the line. */
export interface PlotPoint {
  x: number;
  y: number | null;
}

export interface LineModel {
  options: LineChartOptions;
  series: (LineSeries & { color: ChartColor; plot: PlotPoint[] })[];
  timeDomain: [number, number] | null;
  empty: boolean;
}

/**
 * Sort samples, drop unusable times, and insert breaks where samples are
 * missing (null) or further apart than `maxGapMs`. Lines never bridge a gap.
 */
export function buildLineModel(options: LineChartOptions): LineModel {
  assertUniqueIds(options.series);
  assertDomain(options.timeDomain, "timeDomain");
  assertDomain(options.valueDomain, "valueDomain");
  if (
    options.maxGapMs !== undefined &&
    (!finite(options.maxGapMs) || options.maxGapMs <= 0)
  )
    throw new RangeError("maxGapMs must be positive and finite");
  let lo = Infinity,
    hi = -Infinity,
    any = false;
  const series = options.series.map((s, index) => {
    const points = s.points
      .filter((p) => finite(p.time) && Math.abs(p.time) <= 8.64e15)
      .map((p) => ({ time: p.time, value: finite(p.value) ? p.value : null }))
      .sort((a, b) => a.time - b.time);
    const plot: PlotPoint[] = [];
    let previous: number | undefined;
    for (const p of points) {
      if (
        options.maxGapMs !== undefined &&
        previous !== undefined &&
        p.time - previous > options.maxGapMs
      )
        plot.push({ x: (p.time + previous) / 2, y: null });
      plot.push({ x: p.time, y: p.value });
      previous = p.time;
      lo = Math.min(lo, p.time);
      hi = Math.max(hi, p.time);
      if (p.value !== null) any = true;
    }
    return { ...s, points, color: seriesColor(index, s.color), plot };
  });
  const timeDomain: [number, number] | null = options.timeDomain
    ? [...options.timeDomain]
    : lo <= hi
      ? lo === hi
        ? [lo - 30 * 60_000, hi + 30 * 60_000]
        : [lo, hi]
      : null;
  return { options, series, timeDomain, empty: !any };
}

/** Indices of samples with no plotted neighbour; they need a dot to be visible at all. */
export function isolatedPoints(plot: PlotPoint[]): number[] {
  const out: number[] = [];
  plot.forEach((p, i) => {
    if (p.y === null) return;
    const before = plot[i - 1]?.y ?? null;
    const after = plot[i + 1]?.y ?? null;
    if (before === null && after === null) out.push(i);
  });
  return out;
}

export interface BarModel {
  options: BarChartOptions;
  series: (BarSeries & { color: ChartColor; values: BarValue[] })[];
  range: boolean;
  empty: boolean;
}

export function buildBarModel(options: BarChartOptions): BarModel {
  assertUniqueIds(options.series);
  assertDomain(options.valueDomain, "valueDomain");
  let range = false,
    any = false;
  const series = options.series.map((s, index) => {
    if (s.values.length > options.categories.length)
      throw new RangeError(
        `Series ${s.id} has more values than there are categories`,
      );
    const values = options.categories.map((_, i): BarValue => {
      const v = s.values[i];
      if (Array.isArray(v)) {
        if (!finite(v[0]) || !finite(v[1])) return null;
        range = true;
        any = true;
        return v[0] <= v[1] ? [v[0], v[1]] : [v[1], v[0]];
      }
      if (finite(v)) {
        any = true;
        return v;
      }
      return null;
    });
    return { ...s, color: seriesColor(index, s.color), values };
  });
  if (range && options.stacked)
    throw new Error("Range bars cannot be stacked");
  return { options, series, range, empty: !any };
}

// ---------------------------------------------------------------------------
// Formatting

export function formatChartValue(
  value: number | null | undefined,
  { unit, decimals }: { unit?: string; decimals?: number } = {},
): string {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "Not reported";
  const text = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals ?? 2,
    minimumFractionDigits: decimals ?? 0,
  }).format(value);
  if (!unit) return text;
  return /^[°%]/.test(unit) ? `${text}${unit}` : `${text} ${unit}`;
}

export function formatBarValue(
  value: BarValue,
  opts: { unit?: string; decimals?: number } = {},
): string {
  if (Array.isArray(value))
    return `${formatChartValue(value[0], { decimals: opts.decimals })}–${formatChartValue(value[1], opts)}`;
  return formatChartValue(value, opts);
}

/** Axis ticks: whole numbers in full below 10,000, compact above. */
export function formatAxisValue(value: number, span: number): string {
  if (Math.abs(value) >= 10_000)
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  const digits = span >= 10 ? 0 : span >= 1 ? 1 : 2;
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value);
}

/** Short zone name for captions: "PT", "UTC". */
export function zoneLabel(timeZone = DEFAULT_TIME_ZONE): string {
  if (timeZone === "UTC") return "UTC";
  return (
    new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")
      ?.value.replace(/^P[SD]T$/, "PT") ?? timeZone
  );
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  const key = timeZone + JSON.stringify(options);
  let f = formatters.get(key);
  if (!f) {
    const inner = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hourCycle: "h23",
      ...options,
    });
    // en-GB gives day-month order and 24-hour times; keep three-letter months.
    f = {
      format: (t: number) => inner.format(t).replace("Sept", "Sep"),
      formatToParts: (t: number) => inner.formatToParts(t),
    } as Intl.DateTimeFormat;
    formatters.set(key, f);
  }
  return f;
}

/** Full timestamp for tooltips and tables: "Sun 1 Nov, 14:05". 24-hour, house style. */
export function formatChartTime(
  time: number,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  return formatter(timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(time)
    .replace(" at ", ", ");
}

/** Day label for daily bars: "Sun 1 Nov". */
export function formatChartDay(
  time: number,
  timeZone = DEFAULT_TIME_ZONE,
): string {
  return formatter(timeZone, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(time);
}

/** Offset of `timeZone` from UTC at `time`, in ms (PDT → -7h). */
export function zoneOffset(time: number, timeZone: string): number {
  if (timeZone === "UTC") return 0;
  const parts = Object.fromEntries(
    formatter(timeZone, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(time)
      .map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  );
  return wall - Math.floor(time / 1000) * 1000;
}

const MINUTE = 60_000,
  HOUR = 60 * MINUTE,
  DAY = 24 * HOUR;
const STEPS = [
  MINUTE,
  5 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  3 * HOUR,
  6 * HOUR,
  12 * HOUR,
  DAY,
  2 * DAY,
  7 * DAY,
  14 * DAY,
  28 * DAY,
];

export interface TimeTick {
  value: number;
  label: string;
  /** First tick of a new local day: labelled with the date, not the hour. */
  major: boolean;
}

/**
 * Ticks on local clock boundaries (whole hours, local midnights) in `timeZone`,
 * across daylight-saving changes. At most `maxTicks` are returned.
 */
export function timeTicks(
  min: number,
  max: number,
  { timeZone = DEFAULT_TIME_ZONE, maxTicks = 6 } = {},
): TimeTick[] {
  if (!(max > min)) return [];
  const span = max - min;
  const step =
    STEPS.find((s) => span / s <= Math.max(1, maxTicks - 1)) ??
    Math.ceil(span / (maxTicks - 1) / DAY) * DAY;
  const local = (t: number) => t + zoneOffset(t, timeZone);
  // Wall-clock ms back to an instant; null when the wall time does not exist (spring forward).
  const instant = (wall: number) => {
    const utc = wall - zoneOffset(wall - zoneOffset(wall, timeZone), timeZone);
    return local(utc) === wall ? utc : null;
  };
  const values: number[] = [];
  let wall = Math.ceil(local(min) / Math.min(step, DAY)) * Math.min(step, DAY);
  // Weekly ticks start on Mondays (1970-01-01 was a Thursday).
  if (step >= 7 * DAY)
    wall += ((11 - (Math.floor(wall / DAY) % 7)) % 7) * DAY;
  for (let i = 0; i < 500; i++, wall += step) {
    const utc = instant(wall);
    if (utc === null) continue;
    if (utc > max) break;
    if (utc >= min) values.push(utc);
  }
  return values.map((value) => {
    const major = step >= DAY || isMidnight(value, timeZone);
    return {
      value,
      major,
      label: major
        ? formatter(timeZone, { day: "numeric", month: "short" }).format(value)
        : formatter(timeZone, { hour: "2-digit", minute: "2-digit" }).format(value),
    };
  });
}

function isMidnight(time: number, timeZone: string): boolean {
  const local = time + zoneOffset(time, timeZone);
  return ((local % DAY) + DAY) % DAY === 0;
}

// ---------------------------------------------------------------------------
// Tables and text alternatives

export interface ChartTable {
  caption: string;
  columns: string[];
  rows: string[][];
}

/** Wide table: one row per timestamp, one column per series. */
export function lineTable(model: LineModel): ChartTable {
  const { options } = model;
  const zone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const times = [
    ...new Set(model.series.flatMap((s) => s.points.map((p) => p.time))),
  ].sort((a, b) => a - b);
  const lookup = model.series.map(
    (s) => new Map(s.points.map((p) => [p.time, p.value])),
  );
  const fmt = { decimals: options.decimals };
  return {
    caption: `${options.label}${options.unit ? ` (${options.unit})` : ""}, times in ${zoneLabel(zone)}`,
    columns: [`Time (${zoneLabel(zone)})`, ...model.series.map((s) => s.label)],
    rows: times.map((t, i) => [
      formatChartTime(t, zone),
      ...lookup.map((m) =>
        m.has(t) ? formatChartValue(m.get(t), fmt) : "—",
      ),
    ]),
  };
}

export function barTable(model: BarModel): ChartTable {
  const { options } = model;
  const fmt = { decimals: options.decimals };
  return {
    caption: `${options.label}${options.unit ? ` (${options.unit})` : ""}`,
    columns: [
      options.categoryLabel ?? "Category",
      ...model.series.map((s) => s.label),
    ],
    rows: options.categories.map((category, i) => [
      category,
      ...model.series.map((s) => formatBarValue(s.values[i] ?? null, fmt)),
    ]),
  };
}

function extent(values: number[]): [number, number] | null {
  if (!values.length) return null;
  return [Math.min(...values), Math.max(...values)];
}

/** One sentence per series: the text alternative for the plotted canvas. */
export function describeLine(model: LineModel): string {
  const { options } = model;
  const zone = options.timeZone ?? DEFAULT_TIME_ZONE;
  if (model.empty) return `${options.label}: no readings.`;
  const fmt = { unit: options.unit, decimals: options.decimals };
  const range = model.timeDomain
    ? ` from ${formatChartTime(model.timeDomain[0], zone)} to ${formatChartTime(model.timeDomain[1], zone)} ${zoneLabel(zone)}`
    : "";
  const parts = model.series.map((s) => {
    const valid = s.points.filter((p) => p.value !== null);
    if (!valid.length) return `${s.label}: no readings`;
    const [lo, hi] = extent(valid.map((p) => p.value!))!;
    const last = valid.at(-1)!;
    return `${s.label}: latest ${formatChartValue(last.value, fmt)}, low ${formatChartValue(lo, fmt)}, high ${formatChartValue(hi, fmt)}`;
  });
  return `${options.label}, line chart${range}. ${parts.join("; ")}.`;
}

export function describeBars(model: BarModel): string {
  const { options } = model;
  if (model.empty) return `${options.label}: no values.`;
  const fmt = { unit: options.unit, decimals: options.decimals };
  const parts = model.series.map((s) => {
    let best: { i: number; v: number } | undefined;
    let low: { i: number; v: number } | undefined;
    s.values.forEach((value, i) => {
      if (value === null) return;
      const hi = Array.isArray(value) ? value[1] : value;
      const lo = Array.isArray(value) ? value[0] : value;
      if (!best || hi > best.v) best = { i, v: hi };
      if (!low || lo < low.v) low = { i, v: lo };
    });
    if (!best || !low) return `${s.label}: no values`;
    return `${s.label}: highest ${formatChartValue(best.v, fmt)} (${options.categories[best.i]}), lowest ${formatChartValue(low.v, fmt)} (${options.categories[low.i]})`;
  });
  return `${options.label}, bar chart of ${options.categories.length} ${options.categories.length === 1 ? "category" : "categories"}. ${parts.join("; ")}.`;
}

// ---------------------------------------------------------------------------
// Sparklines (inline SVG; no Chart.js)

export interface SparklineModel {
  width: number;
  height: number;
  color: ChartColor;
  variant: "line" | "bar";
  /** Line path segments; nulls break the line. */
  path: string;
  bars: { x: number; y: number; width: number; height: number }[];
  last: { x: number; y: number } | null;
  description: string;
}

export function buildSparkline(options: SparklineOptions): SparklineModel {
  const width = options.width ?? 120;
  const height = options.height ?? 32;
  const variant = options.variant ?? "line";
  const values = options.values.map((v) => (finite(v) ? v : null));
  const valid = values.filter((v): v is number => v !== null);
  const fmt = { unit: options.unit, decimals: options.decimals };
  const color = seriesColor(0, options.color);
  const description = valid.length
    ? `${options.label}: ${valid.length} readings, from ${formatChartValue(valid[0], fmt)} to ${formatChartValue(valid.at(-1), fmt)}; low ${formatChartValue(Math.min(...valid), fmt)}, high ${formatChartValue(Math.max(...valid), fmt)}.`
    : `${options.label}: no readings.`;
  const empty = { width, height, color, variant, path: "", bars: [], last: null, description };
  if (!valid.length) return empty;
  // Leave room for the 4px end dot and its ring so nothing is clipped.
  const pad = variant === "line" ? 4 : 0;
  let lo = Math.min(...valid),
    hi = Math.max(...valid);
  if (variant === "bar") lo = Math.min(0, lo);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const y = (v: number) =>
    round(pad + (height - 2 * pad) * (1 - (v - lo) / (hi - lo)));
  if (variant === "bar") {
    const slot = width / values.length;
    const barWidth = Math.max(1, Math.min(slot - 2, 8));
    const base = y(Math.max(0, lo));
    return {
      ...empty,
      bars: values.flatMap((v, i) => {
        if (v === null) return [];
        const top = y(v);
        return [
          {
            x: round(i * slot + (slot - barWidth) / 2),
            y: Math.min(top, base),
            width: round(barWidth),
            height: Math.max(1, Math.abs(base - top)),
          },
        ];
      }),
    };
  }
  const n = values.length;
  const x = (i: number) =>
    round(n === 1 ? width / 2 : pad + ((width - 2 * pad) * i) / (n - 1));
  let path = "",
    pen = false,
    last: { x: number; y: number } | null = null;
  values.forEach((v, i) => {
    if (v === null) {
      pen = false;
      return;
    }
    path += `${pen ? "L" : "M"}${x(i)} ${y(v)}`;
    pen = true;
    last = { x: x(i), y: y(v) };
  });
  return { ...empty, path, last };
}

const round = (n: number) => Math.round(n * 100) / 100;
