/**
 * <sierra-sparkline>: an inline SVG trend.
 *
 *   const spark = createSparkline({ label: "Temperature, 24 h", values, unit: "°F" });
 *   spark.values = next;            // or spark.props = { ...spark.props, values: next }
 *
 * In a region, render `sparkline(props)` from lib/ui and pass new props through
 * state; the element updates itself either way.
 */
import { buildSparkline, chartColorVar, type SparklineOptions } from "./chart-model";
import { defineElement, SierraElement } from "./element";
import { sparklineSvg } from "./ui";

export class SierraSparkline extends SierraElement<SparklineOptions> {
  protected template(p: SparklineOptions) {
    return sparklineSvg(buildSparkline(p));
  }
  protected updated(p: SparklineOptions) {
    const m = buildSparkline(p);
    this.style.setProperty("--spark", `var(${chartColorVar(m.color)})`);
    this.classList.add("ds-sparkline");
    this.classList.toggle("ds-sparkline--line", m.variant === "line");
    this.classList.toggle("ds-sparkline--bar", m.variant === "bar");
  }
  get values(): (number | null)[] {
    return [...this.props.values];
  }
  set values(values: (number | null)[]) {
    this.update({ values });
  }
  /** Same as `props` (the 0.7 name). */
  get options(): SparklineOptions {
    return this.props;
  }
  set options(value: SparklineOptions) {
    this.props = value;
  }
}

export const defineSparkline = () => defineElement("sierra-sparkline", SierraSparkline);

export function createSparkline(props: SparklineOptions, { id }: { id?: string } = {}): SierraSparkline {
  defineSparkline();
  const el = document.createElement("sierra-sparkline") as SierraSparkline;
  if (id) el.id = id;
  el.props = props;
  return el;
}

/** @deprecated Set `values` or `props` on the element instead. */
export function renderSparkline(root: HTMLElement, options: SparklineOptions) {
  (root as SierraSparkline).props = options;
}
