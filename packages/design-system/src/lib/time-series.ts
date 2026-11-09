/** @deprecated Types and helpers for TimeSeriesChart, now a wrapper around LineChart. */
export interface TimeSeriesPoint {
  time: number;
  value: number | null;
}
export interface TimeSeries {
  id: string;
  label: string;
  points: TimeSeriesPoint[];
}
export interface TimeSeriesChartOptions {
  label: string;
  description?: string;
  series: TimeSeries[];
  unit?: string;
  timeDomain?: [number, number];
  valueDomain?: [number, number];
  maxGapMs?: number;
}
/** @deprecated TimeSeriesChart is a LineChart in UTC; use LineChart directly. */
export function toLineOptions(options: TimeSeriesChartOptions) {
  return { ...options, timeZone: "UTC" };
}
export interface TimeSeriesChartElement extends HTMLElement {
  options: TimeSeriesChartOptions;
  series: TimeSeries[];
}
export function formatChartTime(time: number): string {
  return new Date(time)
    .toISOString()
    .replace("T", " ")
    .replace(".000Z", " UTC")
    .replace("Z", " UTC");
}
function domain(
  explicit: [number, number] | undefined,
  values: number[],
  fallback: [number, number],
  constantPadding?: number,
): [number, number] {
  if (explicit) {
    if (!explicit.every(Number.isFinite) || explicit[0] >= explicit[1])
      throw new RangeError("Chart domains must be finite and increasing");
    return [...explicit];
  }
  if (!values.length) return fallback;
  let lo = Infinity,
    hi = -Infinity;
  for (const value of values) {
    lo = Math.min(lo, value);
    hi = Math.max(hi, value);
  }
  if (lo === hi) {
    const padding = constantPadding ?? Math.max(Math.abs(lo) * 0.05, 1);
    return [lo - padding, hi + padding];
  }
  return [lo, hi];
}
/** Coordinates use a normalized 0–100 plot. Null/nonfinite values break lines. */
export function buildTimeSeries(options: TimeSeriesChartOptions) {
  if (
    options.maxGapMs !== undefined &&
    (!Number.isFinite(options.maxGapMs) || options.maxGapMs <= 0)
  )
    throw new RangeError("maxGapMs must be positive and finite");
  const ids = new Set<string>();
  const series = options.series.map((series) => {
    if (ids.has(series.id)) throw new Error("Series IDs must be unique");
    ids.add(series.id);
    return {
      ...series,
      points: series.points
        .filter((p) => Number.isFinite(p.time) && Math.abs(p.time) <= 8.64e15)
        .map((p) => ({
          ...p,
          value: p.value !== null && Number.isFinite(p.value) ? p.value : null,
        }))
        .sort((a, b) => a.time - b.time),
    };
  });
  const times = series.flatMap((s) => s.points.map((p) => p.time));
  const values = series.flatMap((s) =>
    s.points.filter((p) => p.value !== null).map((p) => p.value!),
  );
  const timeDomain = domain(options.timeDomain, times, [0, 1], 1000);
  if (timeDomain.some((value) => Math.abs(value) > 8.64e15))
    throw new RangeError("Time domain must contain representable dates");
  const valueDomain = domain(options.valueDomain, values, [0, 1]);
  const scale = (n: number, d: [number, number]) =>
    (100 * (n - d[0])) / (d[1] - d[0]);
  return {
    timeDomain,
    valueDomain,
    empty: !values.length,
    series: series.map((s) => {
      const segments: { x: number; y: number }[][] = [];
      let segment: { x: number; y: number }[] = [];
      let previous: number | undefined;
      for (const p of s.points) {
        if (
          p.value === null ||
          (previous !== undefined &&
            options.maxGapMs !== undefined &&
            p.time - previous > options.maxGapMs)
        ) {
          if (segment.length) segments.push(segment);
          segment = [];
        }
        if (p.value !== null)
          segment.push({
            x: scale(p.time, timeDomain),
            y: 100 - scale(p.value, valueDomain),
          });
        previous = p.time;
      }
      if (segment.length) segments.push(segment);
      return { ...s, segments };
    }),
  };
}
