/**
 * Markup inside <sierra-line-chart>, <sierra-bar-chart> and <sierra-time-series>:
 * caption, legend, canvas and data table. Shared by the Astro components and
 * `createLineChart()` / `createBarChart()`; no Chart.js import, so it renders on the server.
 */
import { html } from "lit-html";
import { chartColorVar, tableToMarkdown, type ChartColor, type ChartTable } from "./chart-model";
import { copyButton, icon } from "./ui";

export interface ChartFrameProps {
  label: string;
  description?: string;
  meta: string;
  summary: string;
  table: ChartTable;
  empty: boolean;
  series: { id: string; label: string; color: ChartColor }[];
  height?: number;
}

export function chartFrameTemplate(p: ChartFrameProps) {
  return html`<figure class="ds-chart__figure">
    <figcaption class="ds-chart__caption">
      <strong class="ds-chart__title">${p.label}</strong>
      ${p.description ? html`<span class="ds-chart__description">${p.description}</span>` : ""}
      <span class="ds-chart__meta">${p.meta}</span>
    </figcaption>
    <ul class="ds-chart__legend" data-chart-legend ?hidden=${p.series.length < 2}>
      ${p.series.map(
        (s) => html`<li><span class="ds-chart-key"><span class="ds-chart-key__swatch" style=${`--key: var(${chartColorVar(s.color)})`} aria-hidden="true"></span><span>${s.label}</span></span></li>`,
      )}
    </ul>
    <div class="ds-chart__frame" data-chart-frame ?hidden=${p.empty} style=${`--chart-h: ${p.height ?? 240}px`}>
      <canvas role="img" aria-label=${p.summary}></canvas>
    </div>
    <p class="ds-chart__empty" data-chart-empty ?hidden=${!p.empty}>No readings for this period.</p>
    <details class="ds-chart__data ds-disclosure">
      <summary>${icon("chevron-right", { cls: "ds-disclosure__icon" })}View data table</summary>
      <div class="ds-chart__data-tools">
        <span class="ds-chart__data-caption" aria-hidden="true" data-chart-caption>${p.table.caption}</span>
        ${copyButton(tableToMarkdown(p.table), { text: "Copy", label: "Copy table as Markdown" })}
      </div>
      <div class="table-wrap" tabindex="0" role="region" aria-label=${`${p.label} data`} data-chart-table>
        <table class="table">
          <caption>${p.table.caption}</caption>
          <thead><tr>${p.table.columns.map((c) => html`<th scope="col">${c}</th>`)}</tr></thead>
          <tbody>
            ${p.table.rows.map((row) => html`<tr>${row.map((cell, i) => (i === 0 ? html`<th scope="row">${cell}</th>` : html`<td>${cell}</td>`))}</tr>`)}
          </tbody>
        </table>
      </div>
    </details>
  </figure>`;
}

import {
  DEFAULT_TIME_ZONE,
  barTable,
  buildBarModel,
  buildLineModel,
  describeBars,
  describeLine,
  lineTable,
  zoneLabel,
  type BarChartOptions,
  type LineChartOptions,
} from "./chart-model";

export function lineFrameProps(options: LineChartOptions): ChartFrameProps {
  const model = buildLineModel(options);
  return {
    label: options.label,
    description: options.description,
    meta: [options.unit && `Values in ${options.unit}`, `Times in ${zoneLabel(options.timeZone ?? DEFAULT_TIME_ZONE)}`]
      .filter(Boolean)
      .join(" · "),
    summary: describeLine(model),
    table: lineTable(model),
    empty: model.empty,
    series: model.series,
    height: options.height,
  };
}

export function barFrameProps(options: BarChartOptions): ChartFrameProps {
  const model = buildBarModel(options);
  return {
    label: options.label,
    description: options.description,
    meta: options.unit ? `Values in ${options.unit}` : "",
    summary: describeBars(model),
    table: barTable(model),
    empty: model.empty,
    series: model.series,
    height: options.height,
  };
}
