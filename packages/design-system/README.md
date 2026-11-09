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

The recipe every overview should follow — the `/dashboard` page of the demo is
the reference:

1. **Title.** `PageHeader` (kicker, title, lead, actions), or for an overview a
   single `SummaryBanner` stating the situation in one serif sentence.
2. **Headline numbers.** `.stats` > `.stat` tiles, each with a `Sparkline`.
3. **Sections.** `.section-header` with an `h2`, an optional `MoreLink`, and an
   optional description `p` (always shown below the title).
4. **Lists stay on the page.** A feed is `.feed` (or `.feed feed--grid`) of
   `FeedItem`s separated by hairlines — not cards.
5. **Panels group media and controls.** `Card variant="panel"`: kicker + title +
   `actions` slot (a `MoreLink`), full-bleed `media` slot (map, image), padded
   body, `source` line. Lay panels out with `.columns` or
   `.columns.columns--wide-narrow`; they stretch to equal height.
6. **Space with the system.** `.stack` between sections, `.columns` for side by
   side, panel bodies space their children. No ad-hoc margins.

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
| Section link | `MoreLink` | `moreLink()` |
| Panel / card | `Card` (`variant="panel"`) | `card()` |
| Feed of reports | `FeedItem` in `.feed` | `feedItem()` |
| Status | `Badge` (ok, elevated, alarm, muted, deep) | `badge()` |
| Notice | `Callout` (orange = risk only) | `callout()` |
| Buttons | `Button` | `button()`/`iconButton()` in `lib/controls`, or `.btn` classes |
| Short choice (°F/°C, 24h/7d) | `SegmentedControl` | `segmented()` |
| Pick a place or item | `ChoiceTiles` (`size="compact"` in panels) | `choiceTiles()` |
| Dropdown | `Select` + `Field` | `createSelect()` |
| Form fields | `Field`, `.input`, `.textarea` | `field()`, `input()` in `lib/controls` |
| Tables | `.table` (`.table--cards` on phones), `DataTable`, `DataRow`, `ValueTable` | classes |
| Numbers | `.stats`/`.stat`, `MetricGrid`, `Sparkline` | `sparkline()` |
| Charts | `LineChart`, `BarChart` | `createLineChart()`, `createBarChart()` |
| Maps | `MapFrame`, `GeoJSONMap` | `createGeoMap()` |
| Record changes | `DataDiff`, `IdentifierList` | `createDataDiff()` |
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
  when removed. Many prop changes in one task render once.

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

`createStore(initial)` (lib/region) is a plain store when state does not belong
in the URL. `renderInto(container, template)` renders once without a store.

## App navigation (Astro ClientRouter)

`lib/app` handles what each app otherwise rediscovers:

- `definePage(match, mount)` — page scripts run once per *visit*, not per view,
  under the ClientRouter. `definePage` mounts on the first load and on every
  navigation that lands on the page (`match`: path, RegExp with named groups, or
  function), with `{ root, url, params, signal }`; `signal` aborts when the page is
  left. Works without the router too.
- `urlState(schema)` — a store kept in the query string. Typed params
  (`param.string/int/bool/oneOf/date/list`) with defaults that are omitted from the
  URL; malformed values fall back. `state.href(patch)` builds shareable links;
  back/forward restore state. Pure helpers: `parseQuery`, `toQuery` (lib/url-state).
- `installNavigation()` — progress sweep while the next page loads
  (`html[data-navigating]`) and `aria-current` on links marked `data-nav`
  (`data-nav="section"` matches sub-pages).
- `navigate(href, { replace })` — client navigation.
- `keepRootAttributes(["data-x"])` — the router replaces `<html>` attributes on
  every swap; ThemeScript already keeps `data-theme`.
- Markup kept across navigations (`transition:persist` sidebars) must use global
  design-system classes, not Astro-scoped styles: scoped class hashes change
  between deployments.

## Charts

Choose by the data's job: a continuous reading over time (temperature,
voltage, signal) is a `LineChart`; totals per period or category (rainfall per
day, messages per node) are a `BarChart`; a trend beside a number is a
`Sparkline`; one number is a `.stat`. Series take the palette in order (lake,
ochre, manzanita, glacier, lupine, pine); pass `color` to pin an entity. Colour
means identity, never status. Times default to Pacific with a 24-hour clock.
Every chart has a caption, a text summary and a data table that copies as
Markdown. See the demo's `/charts` page and CHANGELOG 0.7.

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
