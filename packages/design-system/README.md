# S.I.E.R.R.A design system

Components, tokens and browser helpers for S.I.E.R.R.A's **app-like** sites
(the members portal, the Grid explorer). It shares the public website's brand —
parchment and night-forest grounds, forest green and brass, Newsreader and IBM
Plex — but is tuned for tools: a sans body, a dense 4px grid, panels, feeds,
forms, data views, maps and charts. The public website is editorial and keeps its
own components.

**Before building any UI, find the component here.** If something is missing,
add it to the design system rather than writing a local equivalent. Release
notes and migrations: [CHANGELOG.md](./CHANGELOG.md).

## Set up a site

```sh
pnpm add @sierragridteam/design-system
pnpm add chart.js        # only if you use LineChart, BarChart or TimeSeriesChart
pnpm add maplibre-gl     # only if you use GeoJSONMap
```

In the root layout:

```astro
---
import "@fontsource-variable/newsreader/standard.css";
import "@fontsource-variable/ibm-plex-sans/standard.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@sierragridteam/design-system/styles/global.css";
import IconSprite from "@sierragridteam/design-system/components/IconSprite.astro";
import ThemeScript from "@sierragridteam/design-system/components/ThemeScript.astro";
import { ClientRouter } from "astro:transitions";   // app-like navigation (optional)
---
<html lang="en">
  <head><meta charset="utf-8" /><ThemeScript /><ClientRouter /></head>
  <body>
    <IconSprite />
    <slot />
    <div id="toasts" class="toasts" aria-live="polite"></div>
    <script>
      import { installNavigation } from "@sierragridteam/design-system/lib/app";
      installNavigation();
    </script>
  </body>
</html>
```

Copy `assets/` to `/brand/` in the site's public directory for the logo. Use a
`ThemeSwitcher` somewhere persistent (sidebar footer, account page).

Imports: components from `…/components/Name.astro`, styles from `…/styles/*.css`,
browser code from `…/lib/name` (no extension).

## Compose a page

The recipe every overview should follow (the complete example under "Updating
the page" puts it together; the repository's demo `/dashboard` page is the
full reference):

1. **Title.** `PageHeader` (kicker, title, lead, actions), or for an overview a
   single `SummaryBanner` stating the situation in one serif sentence.
2. **Headline numbers.** `.stats` > `.stat` tiles, each with a `Sparkline`:

   ```html
   <div class="stats">
     <div class="stat">
       <span class="stat__label">Stations online</span>
       <span class="stat__value">7 of 8</span>
       <Sparkline label="Stations online, last 7 days" values={[8, 8, 7, 8, 7, 7, 7]} />
       <span class="stat__sub">Last 7 days</span>
     </div>
   </div>
   ```
3. **Sections.** `.section-header` with an `h2`, an optional `MoreLink`, and an
   optional description `p` (always shown below the title).
4. **Lists stay on the page.** A feed is `.feed` (or `.feed feed--grid`) of
   `FeedItem`s separated by hairlines — not cards.
5. **Panels group media and controls.** `Card variant="panel"`: kicker + title +
   `actions` slot (a `MoreLink`), full-bleed `media` slot (map, image), padded
   body, `source` line. Lay panels out with `.columns` or
   `.columns.columns--wide-narrow`; they stretch to equal height. A map in the
   `media` slot takes the extra height, so a short panel beside a tall one has
   no empty band.
6. **A selected record** starts with `RecordHeader`: badges, title, place, source
   and time, and a `closeLink()` in `actions` (not a "Back to results" link).
   Its fields go in `PropertyList` (not boxed metrics); its history in `DataDiff`s
   labelled "Update 3 · Mon 9 Nov, 09:59 PT" with `count: false`.
7. **Space with the system.** `.stack` between sections, `.columns` for side by
   side. Panel bodies and the banner aside space their blocks (`p`, lists,
   `.field`, `.callout`, `section`, `figure`, `table`, `form`) even inside your
   own wrappers or region hosts. No ad-hoc margins.

Do not:

- write your own panel, eyebrow/kicker, lede/lead, heading row, badge or link
  style — they exist (`Card`, `.kicker`, `.lead`, `.section-header`, `Badge`,
  `MoreLink`);
- put panels on `surface="raised"` (that is for inputs and popovers);
- use raw colours, sizes or spacing — tokens only (`var(--…)`);
- show 12-hour or zone-less times: 24-hour Pacific with "PT";
- draw a continuous reading (temperature, voltage) as bars — see Charts.

## Components

| Need | Astro (server) | Client code |
| --- | --- | --- |
| Page title | `PageHeader`, `SummaryBanner` | `summaryBanner()` |
| Section link | `MoreLink` (text as content or `text`) | `moreLink()` |
| Panel / card | `Card` (`variant="panel"`) | `card()` |
| Feed of reports | `FeedItem` in `.feed` | `feedItem()` (`onSelect` for list-and-detail) |
| Selected record (detail pane) | `RecordHeader` (`actions` slot) | `recordHeader()`, `closeLink()` |
| Status | `Badge` (ok, elevated, alarm, muted, deep) | `badge()` |
| Notice | `Callout` (orange = risk only) | `callout()` |
| Buttons | `Button` | `button()`/`iconButton()` in `lib/controls`, or `.btn` classes |
| Short choice (°F/°C, 24h/7d) | `SegmentedControl` | `segmented()` |
| A value with its condition (50°F, clear) | `.reading` classes | `reading()` |
| Value beside its controls | `.cluster` (`.cluster--between`) | classes |
| Pick a place or item | `ChoiceTiles` (`size="compact"` in panels) | `choiceTiles()` |
| Dropdown | `Select` + `Field` | `createSelect()` |
| Form fields | `Field`, `.input`, `.textarea` | `field()`, `input()` in `lib/controls` |
| Tables | `.table` (`.table--cards` on phones), `DataTable`, `DataRow`, `ValueTable` | classes |
| Numbers | `.stats` of `Stat` (`href` + `actionLabel`: arrow at top right, whole tile links), `MetricGrid`, `Sparkline` | `stat()`, `metricGrid()`, `sparkline()` |
| Record details | `PropertyList` (label/value rows; `identifiers` for hashes/keys) | `propertyList()`, `identifierPills()` |
| Charts | `LineChart`, `BarChart` | `createLineChart()`, `createBarChart()` |
| Maps | `MapFrame`, `GeoJSONMap` (`labels`, `featureList`, `selected`) | `createGeoMap()` |
| Record changes | `DataDiff` (`count={false}`; lists diff as pills), `IdentifierList` | `createDataDiff()` |
| Record timeline | `Timeline` (`state`, `kind: "system"` for the app's own events) | `timeline()` |
| Progress through a window | — | `progress()` (in a `stat()` `extra`) |
| Highway message sign | `MessageSign` | `messageSign()` |
| Data freshness | `DataStatus` | classes |
| Copy | `CopyButton` | `copyButton()` |
| Empty / loading | `EmptyState`, `.skeleton` | `skeletonRows()`, `setBusy()` in `lib/dom` |
| Dialogs, toasts | — | `openDialog()` (`lib/dialog`), `toast()` (`lib/toast`) |
| Theme | `ThemeScript`, `ThemeSwitcher` | `lib/theme` |
| Icons, logo | `Icon`, `IconSprite`, `Logo` | `icon()` |

## Updating the page after data loads

Client code never clones Astro templates, injects component scripts or reaches
into a component's internals. There are two kinds of component:

- **Templates** (display): `feedItem`, `card`, `badge`, `segmented`, … in
  `lib/ui` are functions of props, like React function components. The Astro
  component of the same name renders the same function on the server.
- **Elements** (stateful): `<sierra-select>`, `<sierra-line-chart>`,
  `<sierra-bar-chart>`, `<sierra-geo-map>`, `<sierra-data-diff>`,
  `<sierra-sparkline>`. Each has `create*(props)` and `define*()`, a typed `props`
  property (plus helpers such as `select.value`, `map.data`, `map.selected`,
  `diff.compare(a, b)`, `chart.appendPoints()`), standard events, and cleans up
  when removed. Many prop changes in one task render once. Elements add their
  own classes; write `<sierra-line-chart .props=${p}></sierra-line-chart>` bare.

Register every element a page's client code uses, once, from its module:
`defineSelect()` (lib/select), `defineChartElements()` (lib/charts),
`defineGeoMap()` (lib/geo-map), `defineDataDiff()` (lib/data-diff),
`defineSparkline()` (lib/sparkline). Order does not matter: props set before
registration are picked up. Astro components register their own.

**Regions** re-render part of a page from state, keeping everything that did not
change — the React model, without a framework:

```ts
import { definePage, urlState } from "@sierragridteam/design-system/lib/app";
import { param } from "@sierragridteam/design-system/lib/url-state";
import { region } from "@sierragridteam/design-system/lib/region";
import { html, repeat } from "@sierragridteam/design-system/lib/template";
import { card, feedItem } from "@sierragridteam/design-system/lib/ui";
import { defineChartElements } from "@sierragridteam/design-system/lib/charts";

defineChartElements();
definePage("/overview", async ({ root, signal }) => {
  const state = urlState({ category: param.oneOf(["all", "roads"], "all"), report: param.string("") }, { signal });
  const data = await load(signal);
  region(root.querySelector("#reports")!, state, (s) => html`
    <div class="feed">${repeat(filter(data, s), (r) => r.id, (r) => feedItem({ ...r, selected: r.id === s.report }))}</div>
    ${card({ variant: "panel", title: "Trend" }, html`<sierra-line-chart .props=${chartProps(data, s)}></sierra-line-chart>`)}
  `, { signal });
});
```

A complete list, detail and map view (filter and selection in the URL):

```astro
---
import Card from "@sierragridteam/design-system/components/Card.astro";
import GeoJSONMap from "@sierragridteam/design-system/components/GeoJSONMap.astro";
---
<section id="stations">
  <div class="section-header"><h2>Stations</h2></div>
  <div class="columns columns--wide-narrow">
    <div id="list"><div class="skeleton skeleton--row"></div></div>
    <div id="detail"></div>
  </div>
</section>
<Card variant="panel" kicker="Network" title="Where stations are">
  <GeoJSONMap slot="media" id="map" label="Stations" data={{ type: "FeatureCollection", features: [] }} labels featureList={false} />
</Card>

<script>
  import { definePage, urlState } from "@sierragridteam/design-system/lib/app";
  import { param } from "@sierragridteam/design-system/lib/url-state";
  import { region } from "@sierragridteam/design-system/lib/region";
  import { html, repeat } from "@sierragridteam/design-system/lib/template";
  import { card, feedItem, segmented } from "@sierragridteam/design-system/lib/ui";
  import { defineChartElements } from "@sierragridteam/design-system/lib/charts";
  import { defineDataDiff } from "@sierragridteam/design-system/lib/data-diff";
  import type { SierraGeoMap } from "@sierragridteam/design-system/lib/geo-map";
  defineChartElements();
  defineDataDiff();

  definePage("/stations", async ({ root, signal }) => {
    const state = urlState({ show: param.oneOf(["all", "offline"] as const, "all"), station: param.string("") }, { signal });
    const stations = await loadStations(signal);            // your data
    const visible = (s) => stations.filter((x) => s.show === "all" || !x.online);
    const current = (s) => stations.find((x) => x.id === s.station) ?? stations[0];

    region(root.querySelector("#list")!, state, (s) => html`
      ${segmented({ label: "Show", name: "show", value: s.show,
        options: [{ value: "all", label: "All" }, { value: "offline", label: "Offline" }],
        onChange: (show) => state.set({ show }) })}
      <p class="sr-only" role="status">${visible(s).length} stations</p>
      <div class="feed">${repeat(visible(s), (x) => x.id, (x) => feedItem({
        title: x.name, place: x.place, href: state.href({ station: x.id }),
        onSelect: () => state.set({ station: x.id }), selected: x.id === current(s).id,
        severity: x.online ? undefined : { tone: "alarm", label: "Offline" } }))}</div>`, { signal });

    region(root.querySelector("#detail")!, state, (s) => card(
      { variant: "panel", level: 3, kicker: "Selected", title: current(s).name },
      html`<sierra-line-chart .props=${batteryChart(current(s))}></sierra-line-chart>
           <sierra-data-diff .props=${{ label: "Since yesterday", changes: current(s).changes }}></sierra-data-diff>`), { signal });

    const map = root.querySelector<SierraGeoMap>("#map")!;
    map.data = toFeatures(stations);                          // { label, shortLabel } properties
    const sync = (s) => (map.selected = stations.indexOf(current(s)));
    sync(state.get());
    state.subscribe(sync, { signal });
    map.addEventListener("feature-select", (e) => state.set({ station: stations[e.detail.index].id }), { signal });
  });
</script>
```

On a phone the detail sits below the list; scroll it into view after a
selection if the list is long.

Rules:

- Key every list with `repeat(items, key, template)`, so rows are reused.
- Pass element input with `.props=${…}` (a property binding). The element keeps
  its instance — chart, map, open table, focus — and updates in place.
- Inside a region, change things through state, not element setters. Outside a
  region, setters are the API.
- Give regions, listeners and stores the page's `signal`; leaving the page
  cleans them up.
- Server-render the first view (Astro components) for fast first paint and
  no-JavaScript reading; the region replaces it once data arrives.
- Astro's scoped `<style>` does not reach markup rendered in the browser. Lay
  out client-rendered markup with design-system classes (`.cluster`, `.columns`,
  `.stack`, panel bodies); for page-specific rules use `<style is:global>` with a
  page-level prefix.

`createStore(initial)` (lib/region) is a plain store when state does not belong
in the URL. `renderInto(container, template)` renders once without a store.

## App navigation (Astro ClientRouter)

`lib/app` handles what each app otherwise rediscovers:

- `definePage(match, mount)` — page scripts run once per *visit*, not per view,
  under the ClientRouter. `definePage` mounts on the first load and on every
  navigation that lands on the page (`match`: path, RegExp with named groups, or
  function), with `{ root, url, params, signal }`; `signal` aborts when the page is
  left. Works without the router too.
- `urlState(schema, { signal })` — a store kept in the query string. Typed
  params (`param.string/int/bool/oneOf/date/list`); defaults are omitted from the
  URL and malformed values fall back. `set` rewrites the URL in place
  (`replaceState`), so the address bar is always a shareable link to the view;
  it does not add history entries. Back and forward move between pages, and the
  page re-reads its state from the URL when it mounts. `state.href(patch)` builds
  links. Pure helpers: `parseQuery`, `toQuery` (lib/url-state).
- `installNavigation()` — progress sweep while the next page loads
  (`html[data-navigating]`) and `aria-current` on links marked `data-nav`
  (`data-nav="section"` matches sub-pages).
- `navigate(href, { replace })` — client navigation.
- `keepRootAttributes(["data-x"])` — the router replaces `<html>` attributes on
  every swap; ThemeScript already keeps `data-theme`.
- Markup kept across navigations (`transition:persist` sidebars) must use global
  design-system classes, not Astro-scoped styles: scoped class hashes change
  between deployments.

An app-shell component (sidebar, top bar, mobile drawer) is not in the system
yet; `shell.css` holds the classes members' layout uses (`.shell`, `.sidebar`,
`.topbar`, `.main`, `data-drawer`). Ask before building a shell of your own.
Put page content in `.main > .main__inner`: it starts beside the sidebar.
`.main__inner--wide` (1480px) suits dashboards and list-and-detail views,
`--narrow` forms. Do not centre your own column: on wide screens that opens an
empty band between navigation and content. Plain `p`/`span` text in
`.sidebar__footer` is styled as a caption.

## Times

Show times on a 24-hour Pacific clock with the zone: `formatTimestamp(t)` →
"Mon 9 Nov, 14:05 PT"; `formatChartTime` (no zone, for tables with a zone in the
header), `formatChartDay` ("Mon 9 Nov") and `zoneLabel()` — all in
lib/chart-model and accepting another IANA zone.

## Charts

Choose by the data's job: a continuous reading over time (temperature,
voltage, signal) is a `LineChart`; totals per period or category (rainfall per
day, messages per node) are a `BarChart`; a trend beside a number is a
`Sparkline`; one number is a `.stat`. Series take the palette in order (lake,
ochre, manzanita, glacier, lupine, pine); pass `color` to pin an entity. Colour
means identity, never status. Times default to Pacific with a 24-hour clock.
Every chart has a caption, a text summary and a data table that copies as
Markdown. See the demo's `/charts` page and CHANGELOG 0.7.

## Maps

`GeoJSONMap` draws points, lines and areas over the site basemap. Feature
properties: `label`, `shortLabel` (map label), `description`, `tone`
(`alarm` | `brass`). `labels` names points the way the website's maps do;
`labels="selected"` names only the selection. Clicking a feature emits
`feature-select` with `{ feature, index }`; drive the selection back with
`map.selected`. Set `featureList={false}` only when the page already lists the
same features and selecting there drives `map.selected` (a feed), so keyboard
users have the same path. The basemap style and label fonts load from
`tiles.openfreemap.org`; without it the map shows geometry on plain ground.
Zoom controls follow the theme whether the map comes from `GeoJSONMap` or
`createGeoMap()`.

## Tokens and theme

All colours, sizes and spacing are CSS custom properties in `styles/tokens.css`,
with light and dark values. Check new UI in both themes and at phone width.
Override tokens after the library stylesheet, for both themes. Status colours
(ok / elevated / alarm) always come with a label. Orange is for risk and
destructive actions only.

## Demo

`pnpm dev` in the repository (https://github.com/sierragridteam/sierra-ds):
component catalogue `/`, data and maps `/data`, charts `/charts`, and the
dashboard pattern `/dashboard`.

---

Copyright © 2026 Signal Integrity & Emergency Radio Response Alliance.
All rights reserved. Public availability does not grant permission to reuse
code, design, name, or brand assets. Contact info@sierragridteam.org for permission.
Third-party dependencies retain their own licenses.
