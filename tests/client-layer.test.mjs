import test from "node:test";
import assert from "node:assert/strict";
import { param, parseQuery, toQuery } from "../packages/design-system/src/lib/url-state.ts";
import { toHTML } from "../packages/design-system/src/lib/ssr.ts";
import { badge, card, choiceTiles, feedItem, moreLink, segmented, sparkline } from "../packages/design-system/src/lib/ui.ts";
import { selectTemplate } from "../packages/design-system/src/lib/select-template.ts";
import { dataDiffTemplate } from "../packages/design-system/src/lib/data-diff-template.ts";
import { geoMapTemplate } from "../packages/design-system/src/lib/geo-map-template.ts";
import { chartFrameTemplate, lineFrameProps } from "../packages/design-system/src/lib/chart-frame.ts";
import { html } from "../packages/design-system/src/lib/template.ts";

const schema = {
  metric: param.oneOf(["batteryVolts", "snr"], "batteryVolts"),
  page: param.int(1, { min: 1 }),
  live: param.bool(false),
  from: param.date(),
  layers: param.list(["ALL"], ["ALL", "MESH", "WILDFIRE"]),
  q: param.string(""),
};

test("URL state parses typed values and falls back on anything malformed", () => {
  assert.deepEqual(parseQuery(schema, "?metric=snr&page=3&live=1&from=2026-11-09T20:00:00Z&layers=MESH,BOGUS&q=hwy%204"), {
    metric: "snr",
    page: 3,
    live: true,
    from: new Date("2026-11-09T20:00:00Z"),
    layers: ["MESH"],
    q: "hwy 4",
  });
  assert.deepEqual(parseQuery(schema, "?metric=nope&page=0&live=maybe&from=yesterday"), {
    metric: "batteryVolts",
    page: 1,
    live: false,
    from: null,
    layers: ["ALL"],
    q: "",
  });
});

test("URL state omits defaults, keeps foreign parameters and orders keys", () => {
  assert.equal(toQuery(schema, parseQuery(schema, "")), "");
  assert.equal(
    toQuery(schema, { ...parseQuery(schema, ""), page: 2, metric: "snr", layers: ["MESH", "WILDFIRE"] }, "?utm=x&page=9"),
    "?layers=MESH%2CWILDFIRE&metric=snr&page=2&utm=x",
  );
});

test("design-system templates render on the server and escape text", () => {
  const out = toHTML(feedItem({ title: "<img src=x onerror=alert(1)>", href: "?a=1&b=2", tags: ["Roads"], severity: { tone: "alarm", label: "Severe" } }));
  assert.match(out, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(out, /href="\?a=1&amp;b=2"/);
  assert.match(out, /<span class="\s*badge badge--alarm\s*">Severe<\/span>/);
  assert.doesNotMatch(out, /lit-part|<\?>/);
});

test("radio templates check the chosen option exactly once", () => {
  const out = toHTML(segmented({ label: "Unit", name: "u", options: [{ value: "f", label: "°F" }, { value: "c", label: "°C" }], value: "c" }));
  assert.equal((out.match(/checked/g) ?? []).length, 1);
  assert.match(out, /value="c"\s*checked/);
  assert.doesNotMatch(out, /checked="/);
  const tiles = toHTML(choiceTiles({ label: "Station", name: "s", value: "b", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }));
  assert.equal((tiles.match(/checked/g) ?? []).length, 1);
});

test("every server-rendered template module loads without a DOM", () => {
  for (const out of [
    toHTML(badge("Active", { tone: "ok" })),
    toHTML(moreLink("/events", "Browse all events")),
    toHTML(card({ variant: "panel", kicker: "On the ground", title: "Roads", source: "Caltrans" }, html`<p>Body</p>`)),
    toHTML(sparkline({ label: "Temp", values: [1, 2, 3] })),
    toHTML(selectTemplate({ id: "s", options: [{ value: "a", label: "A" }] })),
    toHTML(dataDiffTemplate({ label: "R", changes: [] })),
    toHTML(geoMapTemplate({ label: "Map", data: { type: "FeatureCollection", features: [] } })),
    toHTML(chartFrameTemplate(lineFrameProps({ label: "C", series: [] }))),
  ])
    assert.ok(out.length > 20);
});

test("panel cards put kicker and title in the header and the source in the footer", () => {
  const out = toHTML(card({ variant: "panel", kicker: "Looking ahead", title: "Weather", source: "NWS" }, "Body"));
  assert.match(out, /class="\s*card card--panel\s*"/);
  assert.match(out, /<span class="kicker">Looking ahead<\/span>\s*<h2 class="card__title">Weather<\/h2>/);
  assert.match(out, /<p class="card__source">NWS<\/p>/);
});
