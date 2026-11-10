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

test("list params fall back when nothing usable remains; invalid dates are dropped", () => {
  assert.deepEqual(parseQuery(schema, "?layers=BOGUS").layers, ["ALL"]);
  assert.deepEqual(parseQuery(schema, "?layers=").layers, []);
  assert.equal(toQuery(schema, { from: new Date("nope") }), "");
});

test("timestamps carry their zone", async () => {
  const { formatTimestamp } = await import("../packages/design-system/src/lib/chart-model.ts");
  assert.equal(formatTimestamp(Date.UTC(2026, 10, 9, 22, 5)), "Mon 9 Nov, 14:05 PT");
  assert.equal(formatTimestamp(Date.UTC(2026, 10, 9, 22, 5), "UTC"), "Mon 9 Nov, 22:05 UTC");
});

test("a panel card renders the same element on server and client paths", () => {
  assert.match(toHTML(card({ variant: "panel", title: "T" }, "B")), /^<section/);
  assert.match(toHTML(card({ title: "T", as: "article", class: "x" }, "B")), /^<article[^>]*class="[^"]*\bx\b/);
});

test("list values in a diff render as identifier pills, not JSON", () => {
  const changed = toHTML(dataDiffTemplate({ label: "Update 3", count: false, changes: [
    { path: "Gateways", kind: "changed", before: ["0b0b037985e4980662d3", "aaaa11112222333344445555"], after: ["0b0b037985e4980662d3", "cccc11112222333344445555"] },
    { path: "Tags", kind: "added", after: ["alpha", "beta"] },
  ] }));
  assert.doesNotMatch(changed, /\[&quot;|\["/);
  assert.match(changed, /data-kind="removed"[^>]*>.*?aaaa11/s);
  assert.match(changed, /data-kind="added"[^>]*>.*?cccc11/s);
  assert.match(changed, /1 unchanged/);
  assert.match(changed, /alpha/);
  assert.doesNotMatch(changed, /changes<\/span>/);
});

test("record header, metric grid and message sign escape text", async () => {
  const { recordHeader, metricGrid, messageSign } = await import("../packages/design-system/src/lib/ui.ts");
  const header = toHTML(recordHeader({ title: "<b>x</b>", meta: "a & b" }));
  assert.match(header, /&lt;b&gt;x&lt;\/b&gt;/);
  const grid = toHTML(metricGrid({ label: "L", items: [{ label: "Keys", identifiers: ["55678f4147f9d04a32c89aa857a1fdb2"] }] }));
  assert.match(grid, /title="55678f4147f9d04a32c89aa857a1fdb2"/);
  assert.match(grid, />55678f</);
  const blank = toHTML(messageSign({ location: "EB 88", pages: null }));
  assert.match(blank, /Sign is blank/);
});

test("timeline marks now, planned and system moments; progress clamps", async () => {
  const { timeline, progress } = await import("../packages/design-system/src/lib/ui.ts");
  const out = toHTML(timeline({ label: "T", items: [{ time: "1", label: "a", kind: "system" }, { time: "2", label: "Now", state: "now" }, { time: "3", label: "b", state: "future" }] }));
  assert.match(out, /is-past[^"]*is-system|is-system[^"]*is-past/);
  assert.match(out, /aria-current="time"/);
  assert.match(out, /is-future/);
  assert.match(toHTML(progress({ value: 1.4, label: "P" })), /aria-valuenow="100"/);
});

test("trend list: one row per measurement with label, value, detail and sparkline", async () => {
  const { trendList } = await import("../packages/design-system/src/lib/ui.ts");
  const out = toHTML(trendList({ label: "Measurements", items: [
    { label: "Battery <V>", value: "4.01 V", detail: "+0.02 over 24 h", values: [4, null, 4.01], unit: "V", decimals: 2 },
    { label: "Noise floor", value: "-120 dBm", values: [-120, -118] },
  ] }));
  assert.equal((out.match(/class="ds-trend"/g) ?? []).length, 2);
  assert.match(out, /Battery &lt;V&gt;/);
  assert.match(out, /\+0\.02 over 24 h/);
  assert.equal((out.match(/sierra-sparkline/g) ?? []).length >= 2, true);
});
