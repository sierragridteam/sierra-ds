/**
 * Display templates: stateless components as functions of props. Use them in
 * `region()` views and client code; the Astro components of the same name
 * render these on the server, so both produce identical markup.
 *
 * Text is always escaped. Pass `TemplateResult`s (from `html`) where a prop
 * accepts content.
 */
import { html, nothing, svg, type TemplateResult } from "lit-html";
import { classMap } from "lit-html/directives/class-map.js";
import { ifDefined } from "lit-html/directives/if-defined.js";
import { live } from "lit-html/directives/live.js";
import { isServer } from "lit-html/is-server.js";
import { buildSparkline, CHART_COLORS, chartColorVar, type SparklineOptions } from "./chart-model";

/**
 * Radios: the attribute sets the initial choice (server and first render); the
 * live property keeps later programmatic changes (back button, store updates)
 * in sync after the user has clicked. Lit's server renderer would write the
 * property out as `checked="false"`, which browsers read as checked.
 */
const checkedProperty = (on: boolean) => (isServer ? nothing : live(on));

type Content = TemplateResult | string | number | typeof nothing | null | undefined;

export type Tone = "ok" | "elevated" | "alarm" | "muted" | "deep";

/** A symbol from IconSprite. Decorative unless `label` is given. */
export function icon(name: string, { label, cls }: { label?: string; cls?: string } = {}) {
  return svg`<svg class=${["icon", cls].filter(Boolean).join(" ")} aria-hidden=${ifDefined(label ? undefined : "true")} role=${ifDefined(label ? "img" : undefined)} aria-label=${ifDefined(label)}><use href=${`#i-${name}`}></use></svg>`;
}

export function badge(text: Content, { tone = "muted", dot = true }: { tone?: Tone; dot?: boolean } = {}) {
  return html`<span class=${classMap({ badge: true, [`badge--${tone}`]: tone !== "muted", "badge--plain": !dot })}>${text}</span>`;
}

export function callout(
  body: Content,
  { tone = "green", title }: { tone?: "green" | "brass" | "orange"; title?: string } = {},
) {
  return html`<div class=${classMap({ callout: true, [`callout--${tone}`]: tone !== "green" })} role=${ifDefined(tone === "orange" ? "alert" : undefined)}>${title ? html`<span class="callout__title">${title}</span>` : nothing}${body}</div>`;
}

/** Copy-to-clipboard button; call `defineCopy()` (lib/copy) once on the client. */
export function copyButton(
  value: string,
  { label = "Copy value", text, class: cls }: { label?: string; text?: string; class?: string } = {},
) {
  return html`<sierra-copy data-value=${value} class=${ifDefined(cls)}>
    <button type="button" class=${classMap({ btn: true, "btn--ghost": true, "btn--sm": true, "btn--icon": !text })} aria-label=${label} title=${ifDefined(text ? undefined : label)}>
      <span data-copy-icon>${icon("copy")}</span>
      <span data-copy-check hidden>${icon("check")}</span>
      ${text ? html`<span data-copy-text>${text}</span>` : nothing}
    </button>
    <span class="sr-only" role="status" aria-live="polite"></span>
  </sierra-copy>`;
}

/**
 * A large value with its condition: "50°F ☀ Clear sky". The icon is decorative;
 * the condition text carries the meaning.
 */
export function reading(value: Content, { condition, icon: name }: { condition?: string; icon?: string } = {}) {
  return html`<span class="reading"><span class="reading__value">${value}</span>${condition
    ? html`<span class="reading__condition">${name ? icon(name) : nothing}${condition}</span>`
    : nothing}</span>`;
}

/** "Browse all events →": the one style for a link to a section's full view. */
export function moreLink(href: string, text: Content) {
  return html`<a class="link-more" href=${href}>${text}${icon("arrow-right")}</a>`;
}

export interface FeedItemProps {
  title: string;
  href?: string;
  severity?: { tone: "alarm" | "elevated" | "ok" | "muted"; label: string };
  tags?: string[];
  place?: string;
  when?: string;
  source?: string;
  /** e.g. "3h ago". */
  received?: string;
  receivedAt?: string;
  lead?: boolean;
  level?: 2 | 3 | 4;
  /** Marks the item as the current selection in a list-and-detail view. */
  selected?: boolean;
  /**
   * List-and-detail views: called instead of following `href` on a plain click
   * (modified clicks still open the link). The whole row is the click target;
   * the title link stays the keyboard path, so keep `href` a shareable URL,
   * e.g. `state.href({ report: id })`.
   */
  onSelect?: () => void;
}

const heading = (level: number, cls: string, content: Content) => {
  switch (level) {
    case 1:
      return html`<h1 class=${cls}>${content}</h1>`;
    case 2:
      return html`<h2 class=${cls}>${content}</h2>`;
    case 4:
      return html`<h4 class=${cls}>${content}</h4>`;
    default:
      return html`<h3 class=${cls}>${content}</h3>`;
  }
};

const selectOnPlainClick = (onSelect: () => void) => (event: MouseEvent) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  onSelect();
};

export function feedItem(p: FeedItemProps, extra: Content = nothing) {
  // aria-current goes on the focusable link, where screen readers announce it.
  return html`<article class=${classMap({ "feed-item": true, "feed-item--lead": !!p.lead, "feed-item--link": !!p.href, "is-selected": !!p.selected })} aria-current=${ifDefined(p.selected && !p.href ? "true" : undefined)}>
    <div class="feed-item__top">
      ${p.severity ? badge(p.severity.label, { tone: p.severity.tone }) : nothing}
      ${(p.tags ?? []).map((tag) => html`<span class="feed-item__tag">${tag}</span>`)}
      ${p.received ? html`<time class="feed-item__received" datetime=${ifDefined(p.receivedAt)}>Received ${p.received}</time>` : nothing}
    </div>
    ${heading(
      p.level ?? 3,
      "feed-item__title",
      p.href
        ? html`<a href=${p.href} aria-current=${ifDefined(p.selected ? "true" : undefined)} @click=${p.onSelect ? selectOnPlainClick(p.onSelect) : nothing}>${p.title}</a>`
        : p.title,
    )}
    ${p.place ? html`<p class="feed-item__place">${p.place}</p>` : nothing}
    ${p.when || p.source
      ? html`<p class="feed-item__meta">${p.when ? html`<span>${p.when}</span>` : nothing}${p.source ? html`<span>${p.source}</span>` : nothing}</p>`
      : nothing}
    ${extra}
  </article>`;
}

export interface SummaryBannerProps {
  kicker?: string;
  headline: Content;
  meta?: string;
  asideTitle?: string;
  aside?: Content;
  level?: 1 | 2;
}

export function summaryBanner(p: SummaryBannerProps) {
  return html`<section class="summary-banner">
    <div class="summary-banner__main">
      ${p.kicker ? html`<span class="kicker">${p.kicker}</span>` : nothing}
      ${p.level === 1 ? html`<h1 class="summary-banner__headline">${p.headline}</h1>` : html`<h2 class="summary-banner__headline">${p.headline}</h2>`}
      ${p.meta ? html`<p class="summary-banner__meta">${p.meta}</p>` : nothing}
    </div>
    ${p.aside
      ? html`<div class="summary-banner__aside">
          ${p.asideTitle ? html`<p class="summary-banner__aside-title">${p.asideTitle}</p>` : nothing}
          ${p.aside}
        </div>`
      : nothing}
  </section>`;
}

export interface CardProps {
  title?: string;
  kicker?: string;
  level?: 2 | 3 | 4;
  variant?: "default" | "panel";
  surface?: "card" | "raised" | "banner";
  padded?: boolean;
  source?: string;
  actions?: Content;
  media?: Content;
  footer?: Content;
  id?: string;
  /** Element; panels default to <section>, like the Astro component. */
  as?: "div" | "section" | "article";
  class?: string;
}

export function card(p: CardProps, body: Content) {
  const panel = p.variant === "panel";
  const level = p.level ?? (panel ? 2 : 3);
  const surface = p.surface ?? "card";
  const header = p.title || p.kicker || p.actions;
  const classes = classMap({ card: true, "card--panel": panel, [`card--${surface}`]: surface !== "card", ...(p.class ? { [p.class]: true } : {}) });
  const content = html`${header
      ? html`<div class="card__header">
          <div class="card__heading">
            ${p.kicker ? html`<span class="kicker">${p.kicker}</span>` : nothing}
            ${p.title ? heading(level, "card__title", p.title) : nothing}
          </div>
          ${p.actions ?? nothing}
        </div>`
      : nothing}
    ${p.media ? html`<div class="card__media">${p.media}</div>` : nothing}
    ${p.padded === false ? body : html`<div class="card__body">${body}</div>`}
    ${p.source || p.footer
      ? html`<div class="card__footer">${p.source ? html`<p class="card__source">${p.source}</p>` : nothing}${p.footer ?? nothing}</div>`
      : nothing}`;
  switch (p.as ?? (panel ? "section" : "div")) {
    case "section":
      return html`<section id=${ifDefined(p.id)} class=${classes}>${content}</section>`;
    case "article":
      return html`<article id=${ifDefined(p.id)} class=${classes}>${content}</article>`;
    default:
      return html`<div id=${ifDefined(p.id)} class=${classes}>${content}</div>`;
  }
}

export interface OptionItem {
  value: string;
  label: string;
  icon?: string;
  detail?: string;
}

export interface SegmentedProps {
  label: string;
  name: string;
  options: OptionItem[];
  value?: string;
  compact?: boolean;
  onChange?: (value: string) => void;
}

export function segmented(p: SegmentedProps) {
  const value = p.value ?? p.options[0]?.value;
  return html`<div class=${classMap({ segmented: true, "segmented--compact": !!p.compact })} @change=${(e: Event) => p.onChange?.((e.target as HTMLInputElement).value)}>
    <fieldset>
      <legend class="sr-only">${p.label}</legend>
      ${p.options.map(
        (o) => html`<label class="segmented__option" title=${ifDefined(p.compact ? o.label : undefined)}>
          <input class="segmented__input" type="radio" name=${p.name} value=${o.value} .checked=${checkedProperty(o.value === value)} ?checked=${o.value === value} />
          ${o.icon ? icon(o.icon) : nothing}
          <span class=${ifDefined(p.compact && o.icon ? "sr-only" : undefined)}>${o.label}</span>
        </label>`,
      )}
    </fieldset>
  </div>`;
}

export interface ChoiceTilesProps extends SegmentedProps {
  size?: "default" | "compact";
  showLabel?: boolean;
}

export function choiceTiles(p: ChoiceTilesProps) {
  return html`<fieldset class="choice-group" @change=${(e: Event) => p.onChange?.((e.target as HTMLInputElement).value)}>
    <legend class=${p.showLabel ? "label choice-group__legend" : "sr-only"}>${p.label}</legend>
    <div class=${classMap({ choices: true, "choices--tiles": p.size === "compact" })}>
      ${p.options.map(
        (o) => html`<label class="choice">
          <input class="choice__input" type="radio" name=${p.name} value=${o.value} .checked=${checkedProperty(o.value === p.value)} ?checked=${o.value === p.value} />
          <span class="choice__label">${o.label}</span>
          ${o.icon || o.detail ? html`<span class="choice__text">${o.icon ? icon(o.icon) : nothing}${o.detail ?? nothing}</span>` : nothing}
        </label>`,
      )}
    </div>
  </fieldset>`;
}

/**
 * Inline SVG trend; themes through CSS. On the server the SVG is rendered
 * inside the element; in the browser the element draws itself from `.props`,
 * so a region and the element never share its children.
 */
export function sparkline(options: SparklineOptions & { id?: string; class?: string }) {
  const { id, class: cls, ...props } = options;
  const m = buildSparkline(props);
  const classes = ["ds-sparkline", `ds-sparkline--${m.variant}`, cls].filter(Boolean).join(" ");
  const style = `--spark: var(${chartColorVar(m.color)})`;
  return isServer
    ? html`<sierra-sparkline id=${ifDefined(id)} class=${classes} style=${style} data-props=${JSON.stringify(props)}>${sparklineSvg(m)}</sierra-sparkline>`
    : html`<sierra-sparkline id=${ifDefined(id)} class=${classes} style=${style} .props=${props}></sierra-sparkline>`;
}

export function sparklineSvg(m: ReturnType<typeof buildSparkline>) {
  return svg`<svg role="img" aria-label=${m.description} viewBox=${`0 0 ${m.width} ${m.height}`} width=${m.width} height=${m.height}>${m.path ? svg`<path class="ds-sparkline__line" d=${m.path}></path>` : nothing}${m.bars.map((b) => svg`<rect class="ds-sparkline__bar" x=${b.x} y=${b.y} width=${b.width} height=${b.height} rx="1"></rect>`)}${m.last ? svg`<circle class="ds-sparkline__dot" cx=${m.last.x} cy=${m.last.y} r="3"></circle>` : nothing}</svg>`;
}

/**
 * Identifiers (hashes, keys, IDs) as compact pills. Long hex values show their
 * first six characters; the full value is the title and the accessible name.
 */
export const shortIdentifier = (value: string) => (/^[0-9a-f]{12,}$/i.test(value) ? value.slice(0, 6) : value);
export function identifierPills(values: readonly string[], { label }: { label?: string } = {}) {
  return html`<ul class="ds-id-pills" aria-label=${ifDefined(label)}>${values.map(
    (value) => html`<li><code title=${value} aria-label=${value}>${shortIdentifier(value)}</code></li>`,
  )}</ul>`;
}

export interface MetricItem {
  label: string;
  value?: string | number | null;
  unit?: string;
  description?: string;
  missing?: string;
  /** A list of identifiers instead of a single value. */
  identifiers?: string[];
}
export interface MetricGridProps {
  label: string;
  items: MetricItem[];
  /** `compact` sets values at UI size: record details rather than headline numbers. */
  size?: "default" | "compact";
}
export function metricGrid(p: MetricGridProps) {
  return html`<dl class=${classMap({ "ds-metric-grid": true, "ds-metric-grid--compact": p.size === "compact" })} aria-label=${p.label}>${p.items.map(
    (item) => html`<div class=${classMap({ "ds-metric": true, "ds-metric--wide": !!item.identifiers && item.identifiers.length > 2 })}>
      <dt>${item.label}</dt>
      <dd>${item.identifiers
        ? item.identifiers.length
          ? identifierPills(item.identifiers, { label: item.label })
          : html`<span class="ds-metric-value ds-metric-missing">${item.missing ?? "None"}</span>`
        : html`<span class=${classMap({ "ds-metric-value": true, "ds-metric-missing": item.value == null })}>${item.value ?? item.missing ?? "Not reported"}</span>${item.value != null && item.unit ? html`<span class="ds-metric-unit"> ${item.unit}</span>` : nothing}`}${item.description ? html`<p class="ds-data-note">${item.description}</p>` : nothing}</dd>
    </div>`,
  )}</dl>`;
}

export interface RecordHeaderProps {
  title: string;
  level?: 1 | 2 | 3;
  kicker?: string;
  /** Status badges first (severity, then state). */
  badges?: { label: string; tone?: Tone; dot?: boolean }[];
  /** Plain category tags after the badges, as in a feed item. */
  tags?: string[];
  /** Where: an area or place line under the title. */
  subtitle?: string;
  /** Who and when: source and report time. */
  meta?: Content;
  /** Right-aligned controls, e.g. a close button. */
  actions?: Content;
}
/** The top of a selected record in a list-and-detail view or a record page. The title takes focus (tabindex -1) after a selection. */
export function recordHeader(p: RecordHeaderProps) {
  const top = p.kicker || p.badges?.length || p.tags?.length || p.actions;
  return html`<header class="record-header">
    ${top
      ? html`<div class="record-header__top">
          <div class="record-header__tags">
            ${p.kicker ? html`<span class="kicker">${p.kicker}</span>` : nothing}
            ${(p.badges ?? []).map((b) => badge(b.label, { tone: b.tone, dot: b.dot }))}
            ${(p.tags ?? []).map((tag) => html`<span class="feed-item__tag">${tag}</span>`)}
          </div>
          ${p.actions ? html`<div class="record-header__actions">${p.actions}</div>` : nothing}
        </div>`
      : nothing}
    ${p.level === 1
      ? html`<h1 class="record-header__title" tabindex="-1">${p.title}</h1>`
      : p.level === 3
        ? html`<h3 class="record-header__title" tabindex="-1">${p.title}</h3>`
        : html`<h2 class="record-header__title" tabindex="-1">${p.title}</h2>`}
    ${p.subtitle ? html`<p class="record-header__subtitle">${p.subtitle}</p>` : nothing}
    ${p.meta ? html`<p class="record-header__meta">${p.meta}</p>` : nothing}
  </header>`;
}

/** Close a selected record. `href` keeps it a real link (the list URL); `onClose` handles plain clicks. */
export function closeLink(href: string, { label = "Close", onClose }: { label?: string; onClose?: () => void } = {}) {
  return html`<a class="btn btn--ghost btn--sm btn--icon" href=${href} aria-label=${label} title=${label} @click=${onClose ? selectOnPlainClick(onClose) : nothing}>${icon("x")}</a>`;
}

export interface MessageSignProps {
  /** Where the sign is, e.g. "EB 4 W/O MURPHYS". */
  location: string;
  route?: string;
  direction?: string;
  /** Each page is a list of lines, as the sign shows them. Empty or missing: blank. */
  pages?: string[][] | null;
  inService?: boolean;
  /** A short note under the location, e.g. "Showing since Wed 4 Nov, 06:20 PT". */
  detail?: string;
}
/**
 * A roadside changeable message sign: one face, its text as drivers see it.
 * Multi-page messages alternate like the sign does (stacked when the viewer
 * prefers reduced motion); dots show the page count.
 */
export function messageSign(p: MessageSignProps) {
  const pages = (p.pages ?? []).map((page) => page.filter((line) => line.trim())).filter((page) => page.length);
  const where = [p.route, p.direction].filter(Boolean).join(" ");
  const text = pages.map((page) => page.join(" ")).join(" / ");
  const label = p.inService === false ? "Sign not in service" : pages.length ? `Sign reads: ${text}` : "Sign is blank";
  return html`<figure class=${classMap({ "message-sign": true, "message-sign--blank": !pages.length, "message-sign--off": p.inService === false })} data-pages=${ifDefined(pages.length > 1 ? String(pages.length) : undefined)}>
    <div class="message-sign__face" role="img" aria-label=${label}>
      <div class="message-sign__display">${pages.length
        ? pages.map((page, i) => html`<div class="message-sign__page" style=${`--sign-page: ${i}`}>${page.map((line) => html`<span>${line}</span>`)}</div>`)
        : html`<div class="message-sign__page"><span>${p.inService === false ? "Not in service" : "Blank"}</span></div>`}</div>
      ${pages.length > 1 ? html`<div class="message-sign__dots" aria-hidden="true">${pages.map((_, i) => html`<span style=${`--sign-page: ${i}`}></span>`)}</div>` : nothing}
    </div>
    <figcaption><strong>${p.location}</strong>${where ? html`<span class="meta">${where}</span>` : nothing}${p.detail ? html`<span class="message-sign__detail">${p.detail}</span>` : nothing}</figcaption>
  </figure>`;
}

export interface StatProps {
  label: string;
  value: Content;
  /** A short line under the value. */
  sub?: Content;
  /** Where the tile leads. The action is an arrow icon at the top right; the whole tile is the target. */
  href?: string;
  /** Accessible name for the action, e.g. "Browse events". Required with `href`. */
  actionLabel?: string;
  /** Extra content after the sub line, e.g. a sparkline. */
  extra?: Content;
}
/** A headline number in `.stats`. */
export function stat(p: StatProps) {
  return html`<div class=${classMap({ stat: true, "stat--action": !!p.href })}>
    <div class="stat__top">
      <span class="stat__label">${p.label}</span>
      ${p.href ? html`<a class="stat__action" href=${p.href} aria-label=${p.actionLabel ?? p.label} title=${p.actionLabel ?? p.label}>${icon("arrow-right")}</a>` : nothing}
    </div>
    <span class="stat__value">${p.value}</span>
    ${p.sub ? html`<span class="stat__sub">${p.sub}</span>` : nothing}
    ${p.extra ?? nothing}
  </div>`;
}

export interface PropertyItem {
  label: string;
  value?: Content;
  /** Hashes or keys, shown as pills. */
  identifiers?: string[];
  missing?: string;
}
export interface PropertyListProps {
  label: string;
  items: PropertyItem[];
}
/**
 * Record details: label and value rows with hairlines, in reading type, in as
 * many columns as fit. For headline numbers use `metricGrid()`.
 */
export function propertyList(p: PropertyListProps) {
  return html`<dl class="ds-properties" aria-label=${p.label}>${p.items.map(
    (item) => html`<div class=${classMap({ "ds-property": true, "ds-property--wide": !!item.identifiers && item.identifiers.length > 4 })}>
      <dt>${item.label}</dt>
      <dd>${item.identifiers
        ? item.identifiers.length
          ? identifierPills(item.identifiers, { label: item.label })
          : html`<span class="ds-property-missing">${item.missing ?? "None"}</span>`
        : item.value === undefined || item.value === null || item.value === ""
          ? html`<span class="ds-property-missing">${item.missing ?? "Not reported"}</span>`
          : item.value}</dd>
    </div>`,
  )}</dl>`;
}

export interface TimelineItem {
  /** Short time, e.g. "11:15" or "Nov 9, 11:15". */
  time: string;
  /** Machine-readable instant for <time datetime>. */
  datetime?: string;
  label: Content;
  detail?: Content;
  /** past (default), now (the current moment) or future (planned). */
  state?: "past" | "now" | "future";
  /** `source`: something that happened in the world (default). `system`: the app's own record-keeping (saved, updated), shown quieter. */
  kind?: "source" | "system";
}
export interface TimelineProps {
  label: string;
  items: TimelineItem[];
}
/** Key moments of a record in time order: what happened, now, and what is planned. */
export function timeline(p: TimelineProps) {
  return html`<ol class="ds-timeline" aria-label=${p.label}>${p.items.map(
    (item) => html`<li class=${classMap({ "ds-timeline__item": true, [`is-${item.state ?? "past"}`]: true, "is-system": item.kind === "system" })} aria-current=${ifDefined(item.state === "now" ? "time" : undefined)}>
      <time class="ds-timeline__time" datetime=${ifDefined(item.datetime)}>${item.time}</time>
      <span class="ds-timeline__mark" aria-hidden="true"><span class="ds-timeline__dot"></span></span>
      <div class="ds-timeline__body"><span class="ds-timeline__label">${item.label}</span>${item.detail ? html`<span class="ds-timeline__detail">${item.detail}</span>` : nothing}</div>
    </li>`,
  )}</ol>`;
}

/** A horizontal progress bar, e.g. how far through a planned window. `value` is 0–1. */
export function progress({ value, label, text }: { value: number; label: string; text?: Content }) {
  const v = Math.max(0, Math.min(1, value));
  return html`<div class="ds-progress"><div class="ds-progress__track" role="progressbar" aria-label=${label} aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(v * 100)}><span class="ds-progress__fill" style=${`width: ${(v * 100).toFixed(1)}%`}></span></div>${text ? html`<span class="ds-progress__text">${text}</span>` : nothing}</div>`;
}

export interface TrendItem {
  label: string;
  /** Latest value, formatted ("4.02 V"). */
  value: Content;
  /** A short qualifier: change over the period, a mean, "as of …". */
  detail?: string;
  /** Plotted left to right; null breaks the line. */
  values: (number | null)[];
  unit?: string;
  decimals?: number;
  color?: SparklineOptions["color"];
}
export interface TrendListProps {
  label: string;
  items: TrendItem[];
}
/**
 * Several measurements at once, each a row of label, latest value and a
 * sparkline: small multiples for a sidebar or panel. Rows take the chart
 * palette in turn unless an item sets `color`. For one measurement in detail
 * use a LineChart.
 */
export function trendList(p: TrendListProps) {
  // Rows are separate measurements, not compared series: cycle the palette so
  // neighbours differ, rather than greying out rows past the sixth.
  return html`<ul class="ds-trends" aria-label=${p.label}>${p.items.map(
    (item, index) => html`<li class="ds-trend">
      <span class="ds-trend__label">${item.label}</span>
      <span class="ds-trend__value">${item.value}</span>
      ${sparkline({ label: `${item.label} trend`, values: item.values, unit: item.unit, decimals: item.decimals, color: item.color ?? CHART_COLORS[index % CHART_COLORS.length], class: "ds-trend__spark", width: 240, height: 36 })}
      ${item.detail ? html`<span class="ds-trend__detail">${item.detail}</span>` : nothing}
    </li>`,
  )}</ul>`;
}

export interface HeatmapProps {
  label: string;
  /** One sentence for screen readers, e.g. "Battery voltage, 8 nodes, hourly over 7 days; lowest Eagle One." */
  summary: string;
  /** Column headings; `tick` is shown under the grid (e.g. only at midnight). */
  columns: { label: string; tick?: string }[];
  rows: { label: string; href?: string; values: (number | null)[]; note?: string }[];
  unit?: string;
  decimals?: number;
  /** Colour range; defaults to the data's min and max. */
  min?: number;
  max?: number;
  /** Chart palette colour for the high end. */
  color?: ChartColor;
  /** Chart palette colour for the low end (a diverging ramp); default a pale tint of `color`. */
  lowColor?: ChartColor;
  /** Labels for the legend ends, e.g. ["low", "high"]. */
  legend?: [string, string];
}
type ChartColor = SparklineOptions["color"];
/**
 * A rows × time grid coloured by value: one row per entity (node, sensor), one
 * column per time bucket. Spots patterns across a fleet (all nodes dipping at
 * night, one row out of step). Empty cells are missing data, never zero.
 */
export function heatmap(p: HeatmapProps) {
  // Default range: 5th to 95th percentile, so one spike does not wash out the rest.
  const values = p.rows.flatMap((r) => r.values.filter((v): v is number => v !== null && Number.isFinite(v))).sort((a, b) => a - b);
  const pct = (q: number) => values[Math.min(values.length - 1, Math.max(0, Math.round(q * (values.length - 1))))];
  const min = p.min ?? (values.length ? pct(0.05) : 0);
  const max = p.max ?? (values.length ? pct(0.95) : 1);
  const span = max - min || 1;
  const digits = p.decimals ?? 1;
  const unit = p.unit ? ` ${p.unit}` : "";
  const color = `var(${chartColorVar(p.color ?? "lake")})`;
  const low = p.lowColor ? `var(${chartColorVar(p.lowColor)})` : `color-mix(in oklab, ${color} 10%, var(--surface-card))`;
  return html`<figure class="ds-heatmap" style=${`--heat: ${color}; --heat-low: ${low}; --cols: ${p.columns.length}`}>
    <div class="ds-heatmap__grid" role="img" aria-label=${`${p.label}. ${p.summary}`}>
      ${p.rows.map(
        (row) => html`<div class="ds-heatmap__row">
          <span class="ds-heatmap__label" title=${row.label}>${row.href ? html`<a href=${row.href}>${row.label}</a>` : row.label}${row.note ? html`<span class="ds-heatmap__note">${row.note}</span>` : nothing}</span>
          ${row.values.map((v, i) =>
            v === null || !Number.isFinite(v)
              ? html`<span class="ds-heatmap__cell is-empty" title=${`${row.label} · ${p.columns[i]?.label ?? ""}: no reading`}></span>`
              : html`<span class="ds-heatmap__cell" style=${`--v: ${Math.max(0, Math.min(1, (v - min) / span)).toFixed(3)}`} title=${`${row.label} · ${p.columns[i]?.label ?? ""}: ${v.toFixed(digits)}${unit}`}></span>`,
          )}
        </div>`,
      )}
      <div class="ds-heatmap__row ds-heatmap__ticks" aria-hidden="true"><span></span>${p.columns.map((c) => html`<span class="ds-heatmap__tick">${c.tick ?? ""}</span>`)}</div>
    </div>
    <figcaption class="ds-heatmap__legend"><span>${p.legend?.[0] ?? "low"} ${min.toFixed(digits)}${unit}</span><span class="ds-heatmap__ramp" aria-hidden="true"></span><span>${max.toFixed(digits)}${unit} ${p.legend?.[1] ?? "high"}</span></figcaption>
  </figure>`;
}

export type StateTone = "ok" | "elevated" | "alarm" | "muted";

export interface CorridorSection {
  /** Distance along the route where the section starts and ends (same unit as `length`). */
  from: number;
  to: number;
  tone: StateTone;
  /** Short text over the section, e.g. "Open · 16 min". */
  label: string;
  /** Longer text for its tooltip and the screen-reader list, e.g. the closure notice. */
  detail?: string;
  /** Draw hatched: the status covers part of the section but the source does not say which part. */
  partial?: boolean;
}
export interface CorridorMarker {
  at: number;
  label: string;
  /** What it is: work zone, closure point, highway sign, incident, camera. Signs draw as a small sign board. */
  kind: "work" | "closure" | "sign" | "incident" | "camera";
  /** Colour; "info" is the chart blue (signs default to it). */
  tone?: StateTone | "info";
  /** A line under the label in the card, e.g. the place and time window. */
  detail?: string;
  /** Richer card content, e.g. a message sign's face. Shown after the label. */
  card?: Content;
  /** The card's link, e.g. the report. */
  href?: string;
  /** Link text (default "Details"). */
  linkLabel?: string;
}
export interface CorridorProps {
  /** The route, e.g. "Hwy 4". */
  name: string;
  /** One line after the name, e.g. "Closed beyond Mt Reba turnoff". */
  summary?: Content;
  summaryTone?: StateTone;
  length: number;
  unit?: string;
  /** Named places along the route: the ends and the joints between sections. */
  stops: { at: number; label: string }[];
  sections: CorridorSection[];
  markers?: CorridorMarker[];
}
const corridorGlyph: Record<CorridorMarker["kind"], string> = { work: "◆", closure: "■", sign: "", incident: "▲", camera: "●" };
const corridorKind: Record<CorridorMarker["kind"], string> = { work: "Work zone", closure: "Closure point", sign: "Highway sign", incident: "Incident", camera: "Camera" };
const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Escape closes a marker's card (it is open while the marker has focus). */
const blurOnEscape = (event: KeyboardEvent) => {
  if (event.key === "Escape") (document.activeElement as HTMLElement | null)?.blur();
};
/**
 * A route as a straight strip: sections coloured by status with their travel
 * text, the places between them, and what sits along it (work zones, signs,
 * closure points). Answers "can I get from A to B" faster than a map. Each
 * marker opens a card on hover, click or keyboard focus. Below about 34rem the
 * strip turns vertical.
 */
export function corridor(p: CorridorProps) {
  const pct = (v: number) => Math.max(0, Math.min(100, (v / (p.length || 1)) * 100));
  const at = (v: number) => `${pct(v).toFixed(2)}%`;
  const unit = p.unit ?? "km";
  const markers = [...(p.markers ?? [])].sort((a, b) => a.at - b.at);
  const id = `ds-corridor-${slug(p.name)}`;
  return html`<figure class="ds-corridor">
    <figcaption class="ds-corridor__head">
      <strong class="ds-corridor__name">${p.name}</strong>
      ${p.summary ? html`<span class=${`ds-corridor__summary ds-corridor__summary--${p.summaryTone ?? "muted"}`}>${p.summary}</span>` : nothing}
    </figcaption>
    <div class="ds-corridor__strip">
      <div class="ds-corridor__labels" aria-hidden="true">
        ${p.sections.map((s) => html`<span class=${`ds-corridor__label ds-corridor__label--${s.tone}`} style=${`--from: ${at(s.from)}; --to: ${at(s.to)}`} title=${s.detail ?? s.label}>${s.label}</span>`)}
      </div>
      <div class="ds-corridor__track">
        ${p.sections.map((s) => html`<span aria-hidden="true" class=${classMap({ "ds-corridor__section": true, [`ds-corridor__section--${s.tone}`]: true, "is-partial": !!s.partial })} style=${`--from: ${at(s.from)}; --to: ${at(s.to)}`} title=${s.detail ?? s.label}></span>`)}
        ${p.stops.map((s) => html`<span aria-hidden="true" class="ds-corridor__joint" style=${`--at: ${at(s.at)}`}></span>`)}
        ${markers.map((m, i) => {
          const tone = m.tone ?? (m.kind === "sign" ? "info" : "muted");
          const side = pct(m.at) < 18 ? "start" : pct(m.at) > 82 ? "end" : "middle";
          // A marker on a stop's joint would sit on top of it: nudge it clear, inward from the ends.
          const joint = p.stops.find((x) => Math.abs(pct(x.at) - pct(m.at)) < 2.5);
          const nudge = joint ? (pct(joint.at) > 98 || pct(m.at) < pct(joint.at) ? -14 : 14) : 0;
          return html`<span class=${`ds-corridor__pin ds-corridor__pin--${side}`} style=${`--at: ${at(m.at)}; --nudge: ${nudge}px`} @keydown=${blurOnEscape}>
            <button type="button" class=${`ds-corridor__marker ds-corridor__marker--${m.kind} ds-corridor__marker--${tone}`} aria-label=${`${corridorKind[m.kind]}: ${m.label}`} aria-describedby=${`${id}-${i}`}>${corridorGlyph[m.kind]}</button>
            <span class="ds-corridor__card" id=${`${id}-${i}`}>
              <span class="ds-corridor__card-kind">${corridorKind[m.kind]}</span>
              <strong class="ds-corridor__card-title">${m.label}</strong>
              ${m.detail ? html`<span class="ds-corridor__card-detail">${m.detail}</span>` : nothing}
              ${m.card ?? nothing}
              ${m.href ? html`<a class="ds-corridor__card-link" href=${m.href}>${m.linkLabel ?? "Details"} →</a>` : nothing}
            </span>
          </span>`;
        })}
      </div>
      <div class="ds-corridor__stops" aria-hidden="true">
        ${p.stops.map((s, i) => html`<span class=${classMap({ "ds-corridor__stop": true, "is-first": i === 0, "is-last": i === p.stops.length - 1 })} style=${`--at: ${at(s.at)}`}>${s.label}</span>`)}
      </div>
    </div>
    <ol class="sr-only">
      ${p.sections.map((s) => html`<li>${p.stops.find((x) => x.at === s.from)?.label ?? `${s.from} ${unit}`} to ${p.stops.find((x) => x.at === s.to)?.label ?? `${s.to} ${unit}`}: ${s.label}${s.detail ? `. ${s.detail}` : ""}</li>`)}
    </ol>
  </figure>`;
}

export interface ScheduleBar {
  start: number;
  end: number;
  tone?: StateTone;
  /** Planned, not yet in place: a tinted bar with an outline; in-place windows are solid. */
  planned?: boolean;
  /** For the card and screen readers, e.g. "One-way traffic control". */
  label?: string;
  /** A line under the time in the card, e.g. "In place now". */
  detail?: string;
  /** The window's own page; the card links to it. */
  href?: string;
}
export interface ScheduleRow {
  label: string;
  detail?: string;
  href?: string;
  /** Rows with the same group sit under one heading (e.g. the highway), in the order given. */
  group?: string;
  bars: ScheduleBar[];
}
export interface ScheduleProps {
  label: string;
  /** Time domain, epoch ms. */
  from: number;
  to: number;
  /** Draws a "now" line. */
  now?: number;
  timeZone?: string;
  rows: ScheduleRow[];
}
/**
 * Planned windows on a shared time axis: one row per job, a bar per window,
 * shaded day columns labelled at the top, a line for now. For work schedules,
 * outages, restrictions: repeated daily windows read as one job, not a list.
 */
export function schedule(p: ScheduleProps) {
  const span = p.to - p.from || 1;
  const frac = (t: number) => Math.max(0, Math.min(1, (t - p.from) / span));
  const pct = (t: number) => `${(frac(t) * 100).toFixed(3)}%`;
  const tz = p.timeZone;
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
  const date = new Intl.DateTimeFormat("en-US", { timeZone: tz, day: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const hourOf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" });
  // Local midnights within the domain (hourly scan copes with DST).
  const ticks: number[] = [];
  // Number(): browsers format hour 0 as "0", "00" or "24" depending on the engine.
  for (let t = Math.ceil(p.from / 3_600_000) * 3_600_000; t < p.to; t += 3_600_000) if (Number(hourOf.format(t)) % 24 === 0) ticks.push(t);
  // Day columns between midnights (the first and last may be partial); every other one shaded.
  const edges = [p.from, ...ticks.filter((t) => t > p.from), p.to];
  const days = edges.slice(0, -1).map((start, i) => ({ start, end: edges[i + 1], label: `${weekday.format(start)} ${date.format(start)}`, shade: i % 2 === 1 }));
  const range = (b: ScheduleBar) => `${time.format(b.start)} – ${time.format(b.end)}`;
  const showNow = p.now !== undefined && p.now >= p.from && p.now <= p.to;
  const columns = (labels: boolean) => days.map((d) => html`<span class=${classMap({ "ds-schedule__day": true, "is-shaded": d.shade })} style=${`--from: ${pct(d.start)}; --to: ${pct(d.end)}`} aria-hidden="true">${labels && frac(d.end) - frac(d.start) > 0.07 ? d.label : nothing}</span>`);
  let group: string | undefined;
  return html`<figure class="ds-schedule" aria-label=${p.label}>
    <div class="ds-schedule__grid">
      <div class="ds-schedule__row ds-schedule__axis" aria-hidden="true"><span></span><div class="ds-schedule__track">${columns(true)}</div></div>
      ${p.rows.map((row) => {
        const heading = row.group && row.group !== group ? html`<div class="ds-schedule__group">${row.group}</div>` : nothing;
        group = row.group;
        return html`${heading}<div class="ds-schedule__row">
        <div class="ds-schedule__label">
          <span class="ds-schedule__title">${row.href ? html`<a href=${row.href}>${row.label}</a>` : row.label}</span>
          ${row.detail ? html`<span class="ds-schedule__detail">${row.detail}</span>` : nothing}
        </div>
        <div class="ds-schedule__track">
          ${columns(false)}
          ${row.bars.filter((b) => b.end > p.from && b.start < p.to).map((b) => {
            const mid = frac((Math.max(b.start, p.from) + Math.min(b.end, p.to)) / 2);
            const side = mid < 0.2 ? "start" : mid > 0.8 ? "end" : "middle";
            return html`<span class=${`ds-schedule__pin ds-schedule__pin--${side}`} style=${`--from: ${pct(b.start)}; --to: ${pct(b.end)}`} @keydown=${blurOnEscape}>
              <button type="button" class=${classMap({ "ds-schedule__bar": true, [`ds-schedule__bar--${b.tone ?? "elevated"}`]: true, "is-planned": !!b.planned })} aria-label=${`${row.group ? row.group + " " : ""}${row.label}: ${b.label ? b.label + ", " : ""}${b.planned ? "planned, " : ""}${range(b)}`}></button>
              <span class="ds-schedule__card" aria-hidden="true">
                <strong class="ds-schedule__card-title">${row.group ? `${row.group} · ` : ""}${row.label}</strong>
                ${row.detail ? html`<span class="ds-schedule__card-detail">${row.detail}</span>` : nothing}
                <span>${range(b)}</span>
                ${b.label || b.detail ? html`<span class="ds-schedule__card-detail">${[b.label, b.detail].filter(Boolean).join(" · ")}</span>` : nothing}
                ${b.href ? html`<a class="ds-schedule__card-link" href=${b.href} tabindex="-1">Report →</a>` : nothing}
              </span>
            </span>`;
          })}
          ${showNow ? html`<span class="ds-schedule__now" style=${`--at: ${pct(p.now!)}`} aria-hidden="true"></span>` : nothing}
        </div>
      </div>`;
      })}
      ${showNow ? html`<div class="ds-schedule__row ds-schedule__axis ds-schedule__foot" aria-hidden="true"><span></span><div class="ds-schedule__track"><span class="ds-schedule__now-label" style=${`--at: ${pct(p.now!)}`}>Now</span></div></div>` : nothing}
    </div>
  </figure>`;
}

export interface ProfileStop {
  label: string;
  elevation: number;
  /** Distance along the route; stops are evenly spaced when any is missing. */
  at?: number;
  /** The reading at the stop, e.g. "36°F". */
  value?: Content;
  /** A short condition under the name, e.g. "Snow". Hidden when narrow. */
  detail?: string;
  icon?: string;
  /** Draw the stop as affected (e.g. above the snow level). */
  tone?: StateTone | "info";
}
export interface ProfileLevel {
  /** Text on the line, e.g. "Snow level now · 7,700 ft". */
  label: Content;
  /** Plain text for screen readers when `label` is rich. */
  text?: string;
  elevation: number;
  color?: ChartColor;
  /** Where the level is expected to move, drawn as a band, e.g. the next 24 hours. */
  range?: [number, number];
  /** Text on the band's far edge, e.g. "Lowest · 5,200 ft · Sat 04:00". */
  rangeLabel?: string;
  /** Tint the ground above the level (snow cover). */
  cover?: boolean;
}
export interface ElevationProfileProps {
  label: string;
  /** One sentence for screen readers. */
  summary: string;
  /** In route order, low end first. */
  stops: ProfileStop[];
  levels?: ProfileLevel[];
  /** Formats an elevation for the stop captions and the screen-reader list. */
  format?: (elevation: number) => string;
}
/**
 * A route seen from the side: places at their elevation on a slope, with
 * levels (snow level, freezing level) drawn across it. Answers "which towns
 * are above the line" at a glance. Stops are placed by distance when every
 * stop has `at`, otherwise evenly.
 */
export function elevationProfile(p: ElevationProfileProps) {
  const format = p.format ?? ((n: number) => `${Math.round(n).toLocaleString("en-US")} m`);
  const levels = p.levels ?? [];
  const elevations = p.stops.map((s) => s.elevation);
  const low = Math.min(...elevations);
  const high = Math.max(...elevations, ...levels.flatMap((l) => [l.elevation, ...(l.range ?? [])]));
  const span = high - low || 1;
  // Ground under the lowest stop, and sky for the captions over the highest.
  const floor = low - span * 0.22, ceiling = high + span * 0.34;
  const y = (elevation: number) => ((ceiling - elevation) / (ceiling - floor)) * 100;
  const placed = p.stops.every((s) => typeof s.at === "number");
  const first = placed ? p.stops[0].at! : 0, last = placed ? p.stops.at(-1)!.at! : Math.max(1, p.stops.length - 1);
  const x = (s: ProfileStop, i: number) => 9 + (((placed ? s.at! : i) - first) / (last - first || 1)) * 82;
  const points = p.stops.map((s, i) => [x(s, i), y(s.elevation)] as const);
  // The slope runs on past the first and last stop to the frame.
  const ridge = [[0, Math.min(98, points[0][1] + 5)] as const, ...points, [100, Math.max(2, points.at(-1)![1] - 5)] as const];
  const path = ridge.map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`).join(" ");
  const ground = svg`<polygon points=${`${path} 100,100 0,100`}></polygon>`;
  const cover = levels.find((l) => l.cover);
  return html`<figure class="ds-profile">
    <div class="ds-profile__plot" role="img" aria-label=${`${p.label}. ${p.summary}`}>
      <svg class="ds-profile__ground" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${ground}</svg>
      ${cover ? html`<svg class="ds-profile__ground ds-profile__ground--cover" style=${`--level: var(${chartColorVar(cover.color ?? "glacier")}); clip-path: inset(0 0 ${(100 - y(cover.elevation)).toFixed(2)}% 0)`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${ground}</svg>` : nothing}
      <svg class="ds-profile__ridge" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points=${path} vector-effect="non-scaling-stroke"></polyline></svg>
      ${levels.map((l) => {
        const style = `--level: var(${chartColorVar(l.color ?? "glacier")})`;
        // The band's label sits on the edge the level is heading for.
        const below = l.range ? l.elevation - Math.min(...l.range) >= Math.max(...l.range) - l.elevation : true;
        return html`${l.range ? html`<span class="ds-profile__band" style=${`${style}; top: ${y(Math.max(...l.range)).toFixed(2)}%; height: ${(y(Math.min(...l.range)) - y(Math.max(...l.range))).toFixed(2)}%`}>${l.rangeLabel ? html`<span class=${`ds-profile__band-label ds-profile__band-label--${below ? "low" : "high"}`}>${l.rangeLabel}</span>` : nothing}</span>` : nothing}
          <span class="ds-profile__level" style=${`${style}; top: ${y(l.elevation).toFixed(2)}%`}><span class="ds-profile__level-label">${l.label}</span></span>`;
      })}
      ${p.stops.map((s, i) => html`<span class=${classMap({ "ds-profile__stop": true, "is-first": i === 0, "is-last": i === p.stops.length - 1, "is-alt": i % 2 === 1, [`ds-profile__stop--${s.tone ?? "plain"}`]: true })} style=${`left: ${points[i][0].toFixed(2)}%; top: ${points[i][1].toFixed(2)}%`}>
        <span class="ds-profile__caption">
          ${s.value !== undefined ? html`<strong class="ds-profile__value">${s.icon ? icon(s.icon) : nothing}${s.value}</strong>` : nothing}
          <span class="ds-profile__name">${s.label}</span>
          <span class="ds-profile__elevation">${format(s.elevation)}</span>
          ${s.detail ? html`<span class="ds-profile__detail">${s.detail}</span>` : nothing}
        </span>
        <span class="ds-profile__dot"></span>
      </span>`)}
    </div>
    <ol class="sr-only">
      ${p.stops.map((s) => html`<li>${s.label}, ${format(s.elevation)}${s.value !== undefined ? html`: ${s.value}` : nothing}${s.detail ? `, ${s.detail}` : ""}</li>`)}
      ${levels.map((l) => html`<li>${l.text ?? l.label}${l.rangeLabel ? `. ${l.rangeLabel}` : ""}${l.range ? `, between ${format(Math.min(...l.range))} and ${format(Math.max(...l.range))}` : ""}</li>`)}
    </ol>
  </figure>`;
}

export interface DayStripItem {
  /** The day, e.g. "Sat 14" or "Today". */
  label: string;
  icon?: string;
  /** The main reading, e.g. the high. */
  high?: Content;
  /** The secondary reading, e.g. the overnight low. */
  low?: Content;
  /** A few words, e.g. "Rain and snow". */
  note?: string;
  /** Chance of precipitation, 0–100; null hides the meter. */
  chance?: number | null;
  /** Longer text for the tooltip, e.g. the detailed forecast. */
  title?: string;
}
/**
 * A run of days side by side: day, icon, high and low, a few words and the
 * chance of precipitation. Scrolls sideways when the days do not fit.
 */
export function dayStrip(p: { label: string; items: DayStripItem[] }) {
  return html`<ol class="ds-days" aria-label=${p.label}>${p.items.map((d) => html`<li class="ds-day" title=${ifDefined(d.title)}>
    <span class="ds-day__label">${d.label}</span>
    ${d.icon ? html`<span class="ds-day__icon">${icon(d.icon)}</span>` : html`<span class="ds-day__icon" aria-hidden="true"></span>`}
    <span class="ds-day__temps">${d.high !== undefined ? html`<strong class="ds-day__high">${d.high}</strong>` : nothing}${d.low !== undefined ? html`<span class="ds-day__low">${d.low}</span>` : nothing}</span>
    ${d.note ? html`<span class="ds-day__note">${d.note}</span>` : nothing}
    ${d.chance === null || d.chance === undefined ? nothing : html`<span class="ds-day__chance"><span class="ds-day__meter" aria-hidden="true"><span style=${`width: ${Math.max(0, Math.min(100, d.chance))}%`}></span></span><span class="ds-day__chance-text">${Math.round(d.chance)}%<span class="sr-only"> chance of precipitation</span></span></span>`}
  </li>`)}</ol>`;
}
