import {
  buildTimeSeries,
  formatChartTime,
  type TimeSeriesChartOptions,
} from "./time-series";
const patterns = ["", "6 3", "2 3", "8 3 2 3"];
/** Replaces this chart only; creates text nodes rather than interpolating HTML. */
export function renderTimeSeries(
  root: HTMLElement,
  options: TimeSeriesChartOptions,
) {
  const model = buildTimeSeries(options);
  const tableWasOpen = root.querySelector("details")?.open ?? false;
  const node = (tag: string, text?: string) => {
    const n = document.createElement(tag);
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const figure = node("figure");
  figure.className = "ds-time-series";
  figure.setAttribute("aria-label", options.label);
  const caption = node("figcaption");
  caption.append(node("strong", options.label));
  if (options.description) caption.append(node("p", options.description));
  figure.append(caption);
  if (model.empty)
    figure.append(
      node(
        "p",
        "No numeric samples. Data availability is determined by the source.",
      ),
    );
  else {
    const svgNode = (tag: string, attrs: Record<string, string>) => {
      const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      return n;
    };
    const svg = svgNode("svg", {
      viewBox: "0 0 640 240",
      role: "img",
      "aria-label": `${options.label}. Time in UTC; values ${options.unit || "unitless"}. Full values in the table below.`,
    });
    const plot = svgNode("svg", {
      x: "65",
      y: "15",
      width: "550",
      height: "180",
      viewBox: "0 0 100 100",
      preserveAspectRatio: "none",
      overflow: "hidden",
    });
    plot.append(
      svgNode("path", {
        d: "M0 0 V100 H100",
        class: "ds-chart-axis",
        "vector-effect": "non-scaling-stroke",
      }),
    );
    for (let i = 0; i < model.series.length; i++)
      for (const segment of model.series[i].segments) {
        const attrs = {
          class: `ds-chart-series ds-chart-series-${i % 4}`,
          "vector-effect": "non-scaling-stroke",
          "stroke-dasharray": patterns[i % 4],
        };
        plot.append(
          svgNode("path", {
            ...attrs,
            d: segment.map((p, j) => `${j ? "L" : "M"}${p.x},${p.y}`).join(" "),
          }),
        );
        for (const p of segment)
          plot.append(
            svgNode("ellipse", {
              cx: String(p.x),
              cy: String(p.y),
              rx: "0.55",
              ry: "1.6",
              class: `ds-chart-dot ds-chart-series-${i % 4}`,
            }),
          );
      }
    svg.append(plot);
    const label = (x: number, y: number, text: string, anchor = "start") => {
      const n = svgNode("text", {
        x: String(x),
        y: String(y),
        "text-anchor": anchor,
      });
      n.textContent = text;
      svg.append(n);
    };
    label(58, 22, `${Number(model.valueDomain[1].toPrecision(5))}`, "end");
    label(58, 195, `${Number(model.valueDomain[0].toPrecision(5))}`, "end");
    label(65, 215, formatChartTime(model.timeDomain[0]));
    label(615, 234, formatChartTime(model.timeDomain[1]), "end");
    figure.append(
      svg,
      node("p", `Values: ${options.unit || "unitless"} · Time: UTC`),
    );
  }
  const legend = node("ul");
  legend.className = "ds-chart-legend";
  model.series.forEach((s, i) => {
    const li = node("li");
    const swatch = node("span");
    swatch.className = `ds-chart-swatch ds-chart-series-${i % 4}`;
    swatch.setAttribute("aria-hidden", "true");
    li.append(swatch, document.createTextNode(s.label));
    legend.append(li);
  });
  figure.append(legend);
  const details = node("details") as HTMLDetailsElement;
  details.open = tableWasOpen;
  details.append(node("summary", "View data table"));
  const region = node("div");
  region.className = "table-wrap";
  region.tabIndex = 0;
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", `${options.label} values`);
  const table = node("table");
  table.className = "table";
  table.append(
    node("caption", `${options.label} — ${options.unit || "unitless"}, UTC`),
  );
  const head = node("thead"),
    row = node("tr");
  for (const title of [
    "Series",
    "Time (UTC)",
    `Value${options.unit ? ` (${options.unit})` : ""}`,
  ]) {
    const th = node("th", title);
    th.setAttribute("scope", "col");
    row.append(th);
  }
  head.append(row);
  table.append(head);
  const body = node("tbody");
  for (const s of model.series)
    for (const p of s.points) {
      const tr = node("tr");
      tr.append(
        node("td", s.label),
        node("td", formatChartTime(p.time)),
        node("td", p.value === null ? "Not reported" : String(p.value)),
      );
      body.append(tr);
    }
  table.append(body);
  region.append(table);
  details.append(region);
  figure.append(details);
  root.replaceChildren(figure);
}
