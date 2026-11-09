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
import { buildSparkline, chartColorVar, type SparklineOptions } from "./chart-model";

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
