import { buildSparkline, chartColorVar, type SparklineOptions } from "./chart-model";

const SVG = "http://www.w3.org/2000/svg";

/** Redraw a <sierra-sparkline> from options; same geometry as the server render. */
export function renderSparkline(root: HTMLElement, options: SparklineOptions) {
  const m = buildSparkline(options);
  root.style.setProperty("--spark", `var(${chartColorVar(m.color)})`);
  root.classList.remove("ds-sparkline--line", "ds-sparkline--bar");
  root.classList.add(`ds-sparkline--${m.variant}`);
  const svg = document.createElementNS(SVG, "svg");
  const attrs = (el: Element, values: Record<string, string | number>) => {
    for (const [k, v] of Object.entries(values)) el.setAttribute(k, String(v));
    return el;
  };
  attrs(svg, {
    role: "img",
    "aria-label": m.description,
    viewBox: `0 0 ${m.width} ${m.height}`,
    width: m.width,
    height: m.height,
  });
  if (m.path)
    svg.append(attrs(document.createElementNS(SVG, "path"), { class: "ds-sparkline__line", d: m.path }));
  for (const b of m.bars)
    svg.append(attrs(document.createElementNS(SVG, "rect"), { class: "ds-sparkline__bar", ...b, rx: 1 }));
  if (m.last)
    svg.append(attrs(document.createElementNS(SVG, "circle"), { class: "ds-sparkline__dot", cx: m.last.x, cy: m.last.y, r: 3 }));
  root.replaceChildren(svg);
}
