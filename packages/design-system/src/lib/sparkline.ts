import { render } from "lit-html";
import { buildSparkline, chartColorVar, type SparklineOptions } from "./chart-model";
import { defineElement } from "./element";
import { sparklineSvg } from "./ui";

/** Redraw a <sierra-sparkline> from options; same markup as the server render. */
export function renderSparkline(root: HTMLElement, options: SparklineOptions) {
  const m = buildSparkline(options);
  root.style.setProperty("--spark", `var(${chartColorVar(m.color)})`);
  root.classList.remove("ds-sparkline--line", "ds-sparkline--bar");
  root.classList.add(`ds-sparkline--${m.variant}`);
  root.dataset.options = JSON.stringify(options);
  root.replaceChildren();
  render(sparklineSvg(m), root);
}

/**
 * <sierra-sparkline>: `values` and `options` setters redraw it. Inside a
 * region, pass new values through the `sparkline()` template instead.
 */
export class SierraSparkline extends HTMLElement {
  private current?: SparklineOptions;
  connectedCallback() {
    this.current ??= JSON.parse(this.dataset.options!);
  }
  get values() {
    return [...(this.options.values ?? [])];
  }
  set values(values: (number | null)[]) {
    this.options = { ...this.options, values };
  }
  get options(): SparklineOptions {
    return structuredClone(this.current ?? JSON.parse(this.dataset.options!));
  }
  set options(value: SparklineOptions) {
    this.current = structuredClone(value);
    renderSparkline(this, this.current);
  }
}

export const defineSparkline = () => defineElement("sierra-sparkline", SierraSparkline);
