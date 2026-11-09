/**
 * Chart.js runtime for <sierra-line-chart> and <sierra-bar-chart>.
 *
 * Chart.js draws on a canvas and needs literal colours, so every render reads
 * the design tokens from the element itself: scoped `data-theme` regions and
 * theme changes resolve correctly. Text stays in ink tokens; series colours
 * are only used for marks.
 */
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
  type ChartConfiguration,
  type ChartDataset,
  type Plugin,
  type Scale,
  type ScriptableContext,
  type TooltipItem,
} from "chart.js";
import {
  CHART_COLORS,
  DEFAULT_TIME_ZONE,
  barTable,
  buildBarModel,
  buildLineModel,
  chartColorVar,
  describeBars,
  describeLine,
  formatAxisValue,
  formatBarValue,
  formatChartTime,
  formatChartValue,
  isolatedPoints,
  lineTable,
  tableToMarkdown,
  timeTicks,
  type BarChartOptions,
  type BarValue,
  type ChartColor,
  type ChartTable,
  type ChartThreshold,
  type LineChartOptions,
  type LinePoint,
  type LineSeries,
} from "./chart-model";
import { onThemeChange } from "./theme";
import { toLineOptions } from "./time-series";

Chart.register(
  LineController,
  BarController,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Filler,
);

export interface ChartPalette {
  series: Record<ChartColor, string>;
  surface: string;
  raised: string;
  ink: string;
  inkSecondary: string;
  inkMuted: string;
  grid: string;
  axis: string;
  line: string;
  fontUi: string;
  fontMono: string;
}

const transparent = (color: string) =>
  !color || color === "transparent" || /rgba?\(.*,\s*0\)$|\/\s*0\)$/.test(color);

/** The colour actually painted behind `el`; marks use it for gaps and rings. */
function surfaceBehind(el: Element, fallback: string): string {
  for (let node: Element | null = el; node; node = node.parentElement) {
    const bg = getComputedStyle(node).backgroundColor;
    if (!transparent(bg)) return bg;
  }
  return fallback;
}

export function readChartPalette(el: Element): ChartPalette {
  const style = getComputedStyle(el);
  const token = (name: string) => style.getPropertyValue(name).trim();
  const series = Object.fromEntries(
    [...CHART_COLORS, "other" as const].map((c) => [c, token(chartColorVar(c))]),
  ) as Record<ChartColor, string>;
  return {
    series,
    surface: surfaceBehind(el, token("--surface-page")),
    raised: token("--surface-raised"),
    ink: token("--ink-strong"),
    inkSecondary: token("--ink-secondary"),
    inkMuted: token("--ink-muted"),
    grid: token("--line-soft"),
    axis: token("--line-control"),
    line: token("--line"),
    fontUi: token("--font-ui"),
    fontMono: token("--font-mono"),
  };
}

/** `#rrggbb` or `rgb()` with alpha, for area washes. */
export function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgb(${n >> 16} ${(n >> 8) & 255} ${n & 255} / ${alpha})`;
  }
  const rgb = /^rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(color);
  return rgb ? `rgb(${rgb[1]} ${rgb[2]} ${rgb[3]} / ${alpha})` : color;
}

const reducedMotion = () =>
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

interface SierraPluginOptions {
  palette: ChartPalette;
  thresholds: ChartThreshold[];
  crosshair: boolean;
  horizontal: boolean;
  unit?: string;
  decimals?: number;
}
declare module "chart.js" {
  interface PluginOptionsByType<TType> {
    sierra?: SierraPluginOptions;
  }
}

/** Reference lines (labelled thresholds) and the crosshair hairline. */
const sierraPlugin: Plugin = {
  id: "sierra",
  beforeDatasetsDraw(chart, _args, raw) {
    const options = raw as SierraPluginOptions;
    const { ctx, chartArea } = chart;
    if (!options?.palette || !chartArea) return;
    const { palette } = options;
    const valueScale = chart.scales[options.horizontal ? "x" : "y"];
    ctx.save();
    for (const threshold of options.thresholds ?? []) {
      const at = valueScale.getPixelForValue(threshold.value);
      if (!Number.isFinite(at)) continue;
      ctx.strokeStyle = palette.inkMuted;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (options.horizontal) {
        ctx.moveTo(Math.round(at) + 0.5, chartArea.top);
        ctx.lineTo(Math.round(at) + 0.5, chartArea.bottom);
      } else {
        ctx.moveTo(chartArea.left, Math.round(at) + 0.5);
        ctx.lineTo(chartArea.right, Math.round(at) + 0.5);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (options.crosshair && active.length) {
      const x = Math.round(active[0].element.x) + 0.5;
      ctx.strokeStyle = palette.axis;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
    }
    ctx.restore();
  },
  // Labels go above the series so a crossing line never hides them.
  afterDatasetsDraw(chart, _args, raw) {
    const options = raw as SierraPluginOptions;
    const { ctx, chartArea } = chart;
    if (!options?.palette || !chartArea) return;
    const { palette } = options;
    const valueScale = chart.scales[options.horizontal ? "x" : "y"];
    ctx.save();
    for (const threshold of options.thresholds ?? []) {
      const at = valueScale.getPixelForValue(threshold.value);
      if (!Number.isFinite(at)) continue;
      ctx.font = `12px ${palette.fontUi}`;
      const text = `${threshold.label} · ${formatChartValue(threshold.value, options)}`;
      // A surface-coloured plate keeps the label legible where a series crosses it.
      const width = ctx.measureText(text).width;
      const [x, y] = options.horizontal
        ? [at + 4, chartArea.top]
        : [chartArea.right - width, at - 17];
      ctx.fillStyle = palette.surface;
      ctx.fillRect(x - 3, y, width + 6, 15);
      ctx.fillStyle = palette.inkSecondary;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(text, x, y + 1);
    }
    ctx.restore();
  },
};
Chart.register(sierraPlugin);

/** Keep thresholds inside the plotted range unless the domain is explicit. */
function includeThresholds(thresholds: ChartThreshold[] = []) {
  return (scale: Scale) => {
    for (const t of thresholds) {
      if (t.value < scale.min) scale.min = t.value;
      if (t.value > scale.max) scale.max = t.value;
    }
  };
}

function tooltipTheme(palette: ChartPalette) {
  return {
    backgroundColor: palette.raised,
    borderColor: palette.line,
    borderWidth: 1,
    titleColor: palette.ink,
    bodyColor: palette.ink,
    titleFont: { family: palette.fontUi, size: 13, weight: 600 as const },
    bodyFont: { family: palette.fontUi, size: 13 },
    padding: 10,
    cornerRadius: 4,
    boxWidth: 12,
    boxHeight: 3,
    boxPadding: 6,
    caretSize: 0,
    displayColors: true,
  };
}

function valueAxis(
  palette: ChartPalette,
  {
    domain,
    zero,
    thresholds,
  }: {
    domain?: [number, number];
    zero?: boolean;
    thresholds?: ChartThreshold[];
  },
) {
  return {
    type: "linear" as const,
    min: domain?.[0],
    max: domain?.[1],
    beginAtZero: zero,
    grace: domain ? 0 : "5%",
    afterDataLimits: domain ? undefined : includeThresholds(thresholds),
    border: { display: false },
    grid: { color: palette.grid, lineWidth: 1, drawTicks: false },
    ticks: {
      color: palette.inkSecondary,
      font: { family: palette.fontMono, size: 11 },
      padding: 8,
      maxTicksLimit: 6,
      callback(this: Scale, value: number | string) {
        return formatAxisValue(Number(value), this.max - this.min);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Configurations

export function lineChartConfig(
  options: LineChartOptions,
  palette: ChartPalette,
  hidden: ReadonlySet<string> = new Set(),
): ChartConfiguration<"line", { x: number; y: number | null }[]> {
  const model = buildLineModel(options);
  const zone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const fmt = { unit: options.unit, decimals: options.decimals };
  const labels = new Map<number, string>();
  const datasets = model.series.map(
    (s): ChartDataset<"line", { x: number; y: number | null }[]> => {
      const color = palette.series[s.color];
      const dots = new Set(isolatedPoints(s.plot));
      const lastIndex = s.plot.findLastIndex((p) => p.y !== null);
      return {
        label: s.label,
        data: s.plot,
        parsing: false,
        hidden: hidden.has(s.id),
        borderColor: color,
        backgroundColor: s.area ? withAlpha(color, 0.1) : color,
        fill: s.area ? "start" : false,
        // Leave missing stretches unwashed as well as unlined.
        segment: s.area
          ? {
              backgroundColor: (ctx) =>
                ctx.p0.skip || ctx.p1.skip ? "transparent" : undefined,
            }
          : undefined,
        borderWidth: 2,
        borderJoinStyle: "round",
        borderCapStyle: "round",
        tension: 0,
        spanGaps: false,
        pointBackgroundColor: color,
        pointBorderColor: palette.surface,
        pointBorderWidth: 2,
        pointHoverBorderWidth: 2,
        pointRadius: (ctx: ScriptableContext<"line">) =>
          ctx.dataIndex === lastIndex ? 4 : dots.has(ctx.dataIndex) ? 3 : 0,
        pointHoverRadius: 5,
        pointHitRadius: 8,
      };
    },
  );
  return {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion() ? false : { duration: 250 },
      interaction: { mode: "nearest", axis: "x", intersect: false },
      layout: { padding: { top: 8, right: 8 } },
      scales: {
        x: {
          type: "linear",
          min: model.timeDomain?.[0],
          max: model.timeDomain?.[1],
          border: { color: palette.axis },
          grid: { display: false },
          afterBuildTicks(scale) {
            labels.clear();
            scale.ticks = timeTicks(scale.min, scale.max, {
              timeZone: zone,
              maxTicks: Math.max(2, Math.floor(scale.width / 72)),
            }).map((t) => {
              labels.set(t.value, t.label);
              return { value: t.value, major: t.major };
            });
          },
          ticks: {
            autoSkip: false,
            maxRotation: 0,
            color: palette.inkSecondary,
            font: (ctx) => ({
              family: palette.fontMono,
              size: 11,
              weight: ctx.tick?.major ? 600 : 400,
            }),
            callback: (value) => labels.get(Number(value)) ?? "",
          },
        },
        y: valueAxis(palette, {
          domain: options.valueDomain,
          zero: options.zero,
          thresholds: options.thresholds,
        }),
      },
      plugins: {
        legend: { display: false },
        sierra: {
          palette,
          thresholds: options.thresholds ?? [],
          crosshair: true,
          horizontal: false,
          ...fmt,
        },
        tooltip: {
          ...tooltipTheme(palette),
          callbacks: {
            title: (items) =>
              items.length ? formatChartTime(items[0].parsed.x ?? 0, zone) : "",
            label: (item: TooltipItem<"line">) =>
              `${formatChartValue(item.parsed.y, fmt)}  ${item.dataset.label}`,
            labelColor: (item) => ({
              borderColor: item.dataset.borderColor as string,
              backgroundColor: item.dataset.borderColor as string,
              borderWidth: 0,
              borderRadius: 1,
            }),
          },
        },
      },
    },
  };
}

export function barChartConfig(
  options: BarChartOptions,
  palette: ChartPalette,
  hidden: ReadonlySet<string> = new Set(),
): ChartConfiguration<"bar", BarValue[]> {
  const model = buildBarModel(options);
  const horizontal = !!options.horizontal;
  const fmt = { unit: options.unit, decimals: options.decimals };
  const visible = model.series
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => !hidden.has(s.id));
  // In a stack only the outermost segment of each bar gets the rounded end.
  const outermost = options.categories.map((_, c) => {
    for (let k = visible.length - 1; k >= 0; k--)
      if (visible[k].s.values[c] !== null) return visible[k].i;
    return -1;
  });
  const end = horizontal
    ? { topRight: 4, bottomRight: 4, topLeft: 0, bottomLeft: 0 }
    : { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 };
  const datasets = model.series.map(
    (s, index): ChartDataset<"bar", BarValue[]> => {
      const color = palette.series[s.color];
      const base = {
        label: s.label,
        data: s.values,
        hidden: hidden.has(s.id),
        backgroundColor: color,
        hoverBackgroundColor: color,
        maxBarThickness: 24,
        barPercentage: 0.9,
        categoryPercentage: 0.8,
      };
      if (model.range)
        return { ...base, borderRadius: 4, borderSkipped: false };
      if (!options.stacked)
        return { ...base, borderRadius: 4, borderSkipped: "start" };
      // A 2px surface-coloured edge separates stacked segments.
      const below = visible.findIndex((v) => v.i === index) > 0;
      return {
        ...base,
        stack: "stack",
        borderSkipped: false,
        borderColor: palette.surface,
        borderWidth: below
          ? horizontal
            ? { left: 2 }
            : { bottom: 2 }
          : 0,
        borderRadius: (ctx: ScriptableContext<"bar">) =>
          outermost[ctx.dataIndex] === index ? end : 0,
      };
    },
  );
  const categoryAxis = {
    type: "category" as const,
    stacked: !!options.stacked,
    border: { color: palette.axis },
    grid: { display: false },
    ticks: {
      color: palette.inkSecondary,
      font: { family: palette.fontUi, size: 12 },
      maxRotation: 0,
      autoSkip: true,
      autoSkipPadding: 12,
    },
  };
  const values = {
    ...valueAxis(palette, {
      domain: options.valueDomain,
      zero: !model.range,
      thresholds: options.thresholds,
    }),
    stacked: !!options.stacked,
  };
  return {
    type: "bar",
    data: { labels: options.categories, datasets },
    options: {
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion() ? false : { duration: 250 },
      interaction: { mode: "index", axis: horizontal ? "y" : "x", intersect: false },
      layout: { padding: { top: 8, right: 8 } },
      scales: horizontal
        ? { x: values, y: categoryAxis }
        : { x: categoryAxis, y: values },
      plugins: {
        legend: { display: false },
        sierra: {
          palette,
          thresholds: options.thresholds ?? [],
          crosshair: false,
          horizontal,
          ...fmt,
        },
        tooltip: {
          ...tooltipTheme(palette),
          filter: (item) => item.raw !== null,
          callbacks: {
            label: (item: TooltipItem<"bar">) =>
              `${formatBarValue(item.raw as BarValue, fmt)}  ${item.dataset.label}`,
            labelColor: (item) => ({
              borderColor: item.dataset.backgroundColor as string,
              backgroundColor: item.dataset.backgroundColor as string,
              borderWidth: 0,
              borderRadius: 1,
            }),
          },
        },
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Shared DOM: legend and data table

export function renderChartTable(target: Element, table: ChartTable) {
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const t = el("table");
  t.className = "table";
  t.append(el("caption", table.caption));
  const head = el("thead"),
    headRow = el("tr");
  for (const column of table.columns) {
    const th = el("th", column);
    th.scope = "col";
    headRow.append(th);
  }
  head.append(headRow);
  const body = el("tbody");
  for (const row of table.rows) {
    const tr = el("tr");
    row.forEach((cell, i) => {
      if (i === 0) {
        const th = el("th", cell);
        th.scope = "row";
        tr.append(th);
      } else tr.append(el("td", cell));
    });
    body.append(tr);
  }
  t.append(head, body);
  target.replaceChildren(t);
}

function renderLegend(
  target: Element,
  series: { id: string; label: string; color: ChartColor }[],
  hidden: Set<string>,
  onToggle: (id: string) => void,
) {
  const items = series.map((s) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ds-chart-key";
    button.dataset.series = s.id;
    button.setAttribute("aria-pressed", String(!hidden.has(s.id)));
    const swatch = document.createElement("span");
    swatch.className = "ds-chart-key__swatch";
    swatch.style.setProperty("--key", `var(${chartColorVar(s.color)})`);
    swatch.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = s.label;
    button.append(swatch, label);
    button.addEventListener("click", () => onToggle(s.id));
    li.append(button);
    return li;
  });
  target.replaceChildren(...items);
}

// ---------------------------------------------------------------------------
// Custom elements

abstract class SierraChart<O extends { label: string }> extends HTMLElement {
  chart?: Chart;
  protected current?: O;
  protected hiddenSeries = new Set<string>();
  private abort?: AbortController;
  private tableStale = false;

  protected abstract config(
    options: O,
    palette: ChartPalette,
  ): ChartConfiguration<"line" | "bar", unknown[]>;
  protected abstract text(options: O): {
    description: string;
    table: ChartTable;
    empty: boolean;
    series: { id: string; label: string; color: ChartColor }[];
  };

  get options(): O {
    return structuredClone(this.current!);
  }
  set options(value: O) {
    const next = structuredClone(value);
    // Validate first: a rejected update leaves the previous chart and options in place.
    this.text(next);
    this.current = next;
    if (this.isConnected) this.render();
  }

  connectedCallback() {
    this.current ??= JSON.parse(this.dataset.options!);
    this.abort = new AbortController();
    const { signal } = this.abort;
    onThemeChange(() => this.render(), { signal });
    this.querySelector("details")?.addEventListener(
      "toggle",
      () => this.refreshTable(),
      { signal },
    );
    this.render();
  }

  disconnectedCallback() {
    this.abort?.abort();
    this.chart?.destroy();
    this.chart = undefined;
  }

  protected render() {
    const options = this.current!;
    const canvas = this.querySelector("canvas")!;
    const text = this.text(options);
    const config = this.config(options, readChartPalette(this));
    canvas.setAttribute("aria-label", text.description);
    const frame = this.querySelector<HTMLElement>("[data-chart-frame]")!;
    const empty = this.querySelector<HTMLElement>("[data-chart-empty]")!;
    frame.hidden = text.empty;
    empty.hidden = !text.empty;
    if (this.chart) {
      this.chart.data = config.data as never;
      this.chart.options = config.options as never;
      this.chart.update("none");
    } else {
      this.chart = new Chart(canvas, config as never);
    }
    const legend = this.querySelector<HTMLElement>("[data-chart-legend]");
    if (legend) {
      legend.hidden = text.series.length < 2;
      renderLegend(legend, text.series, this.hiddenSeries, (id) => {
        if (this.hiddenSeries.has(id)) this.hiddenSeries.delete(id);
        else this.hiddenSeries.add(id);
        this.render();
        this.querySelector<HTMLElement>(
          `[data-series="${CSS.escape(id)}"]`,
        )?.focus();
      });
    }
    this.tableStale = true;
    this.refreshTable(text.table);
  }

  /** Rebuilding a long table on every streamed sample is wasted work while it is closed. */
  private refreshTable(table?: ChartTable) {
    const details = this.querySelector("details");
    const target = this.querySelector("[data-chart-table]");
    if (!details || !target || !this.tableStale || !details.open) return;
    const data = table ?? this.text(this.current!).table;
    renderChartTable(target, data);
    const copy = this.querySelector<HTMLElement & { value: string }>("sierra-copy");
    if (copy) copy.value = tableToMarkdown(data);
    const caption = this.querySelector("[data-chart-caption]");
    if (caption) caption.textContent = data.caption;
    this.tableStale = false;
  }
}

export class SierraLineChart extends SierraChart<LineChartOptions> {
  protected config(options: LineChartOptions, palette: ChartPalette) {
    return lineChartConfig(options, palette, this.hiddenSeries) as never;
  }
  protected text(options: LineChartOptions) {
    const model = buildLineModel(options);
    return {
      description: describeLine(model),
      table: lineTable(model),
      empty: model.empty,
      series: model.series,
    };
  }
  get series(): LineSeries[] {
    return this.options.series;
  }
  set series(series: LineSeries[]) {
    this.options = { ...this.current!, series };
  }
  /**
   * Append live samples to one series. With `windowMs`, samples older than the
   * newest minus the window are dropped and the time domain follows the data.
   */
  appendPoints(
    seriesId: string,
    points: LinePoint[],
    { windowMs }: { windowMs?: number } = {},
  ) {
    const options = this.current!;
    const series = options.series.map((s) =>
      s.id === seriesId ? { ...s, points: [...s.points, ...points] } : s,
    );
    if (!series.some((s) => s.id === seriesId))
      throw new Error(`Unknown series: ${seriesId}`);
    let timeDomain = options.timeDomain;
    if (windowMs) {
      const newest = Math.max(
        ...series.flatMap((s) => s.points.map((p) => p.time)),
      );
      const cutoff = newest - windowMs;
      for (const s of series) s.points = s.points.filter((p) => p.time >= cutoff);
      timeDomain = [cutoff, newest];
    }
    this.options = { ...options, series, timeDomain };
  }
}

export class SierraBarChart extends SierraChart<BarChartOptions> {
  protected config(options: BarChartOptions, palette: ChartPalette) {
    return barChartConfig(options, palette, this.hiddenSeries) as never;
  }
  protected text(options: BarChartOptions) {
    const model = buildBarModel(options);
    return {
      description: describeBars(model),
      table: barTable(model),
      empty: model.empty,
      series: model.series,
    };
  }
}

/** @deprecated <sierra-time-series>: TimeSeriesChart options rendered as a UTC line chart. */
export class SierraTimeSeries extends SierraLineChart {
  protected config(options: LineChartOptions, palette: ChartPalette) {
    return super.config(toLineOptions(options), palette);
  }
  protected text(options: LineChartOptions) {
    return super.text(toLineOptions(options));
  }
}

export function defineChartElements() {
  if (!customElements.get("sierra-time-series"))
    customElements.define("sierra-time-series", SierraTimeSeries);
  if (!customElements.get("sierra-line-chart"))
    customElements.define("sierra-line-chart", SierraLineChart);
  if (!customElements.get("sierra-bar-chart"))
    customElements.define("sierra-bar-chart", SierraBarChart);
}

export interface LineChartElement extends HTMLElement {
  options: LineChartOptions;
  series: LineSeries[];
  appendPoints(seriesId: string, points: LinePoint[], opts?: { windowMs?: number }): void;
  chart?: Chart;
}
export interface BarChartElement extends HTMLElement {
  options: BarChartOptions;
  chart?: Chart;
}
