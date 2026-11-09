# Changelog

## 0.8.0

App patterns and a client layer, so apps compose pages from the system and
update them after data loads without fighting Astro. Reference: the demo's
`/dashboard` page.

### Added

- **Panels:** `Card variant="panel"` — kicker, serif title, `actions` slot
  (use `MoreLink`), full-bleed `media` slot, padded body, `source` footer;
  equal heights in a row. Layout: `.columns`, `.columns--wide-narrow`.
- **`SummaryBanner`** — the one dark headline block on an overview, with an
  `aside` ("Worth your attention").
- **`FeedItem`** in `.feed` / `.feed--grid` — severity, tags, title, place,
  time window, source, received; `lead` and `selected` states.
- **`MoreLink`** — "Browse all →"; **`SegmentedControl`** — short exclusive
  options (°F/°C); **`ChoiceTiles`** — pick a place or item, `size="compact"`.
- **Templates** (`lib/ui`): `feedItem`, `card`, `summaryBanner`, `badge`,
  `callout`, `moreLink`, `segmented`, `choiceTiles`, `sparkline`, `copyButton`,
  `icon` — the same markup the Astro components render (`lib/ssr` `toHTML`).
  `lib/template` re-exports lit-html (`html`, `repeat`, `classMap`, …).
- **Regions** (`lib/region`): `region(container, store, view)`,
  `createStore()`, `renderInto()` — keyed, in-place re-rendering of sub-trees.
- **Element contract** (`lib/element`): every stateful component has
  `create*()`, `define*()`, a typed `props` property, batched rendering and
  automatic cleanup. New: `createSelect` (`value`, `options` setters),
  `createDataDiff` (`changes`, `compare()`), `createGeoMap` (`data`, `selected`;
  updates sources without rebuilding the map), `createLineChart`,
  `createBarChart` (charts accept `props` as well as `options`).
- **Navigation** (`lib/app`): `definePage`, `urlState` (typed query-string
  store; `lib/url-state` `param.*`, `parseQuery`, `toQuery`), `installNavigation`
  (progress sweep, `data-nav` current links), `navigate`, `keepRootAttributes`.
- Package README with setup, page recipe, component catalogue and rules.

### Changed

- `Select`, `DataDiff`, `GeoJSONMap`, `CopyButton`, `Sparkline` and the chart
  frame render from the shared templates. Markup and classes are unchanged.
- Chart captions (title, description, unit, zone) follow `options` updates.
- New dependencies: `lit-html` (browser, ~7 KB) and `@lit-labs/ssr` (server
  rendering at build time).

### Migrating an app

- Replace hidden `<template>` clones and injected component scripts with
  `create*()` / `define*()`.
- Replace reaching into a component's DOM (e.g. setting a select's label) with
  its properties: `select.value = …`, `select.options = …`, `map.data = …`.
- Replace hand-built panels, eyebrows, ledes and heading rows with
  `Card variant="panel"`, `.kicker`, `.lead`, `.section-header`, `MoreLink`.
- Replace `replaceChildren` re-renders of lists and detail panes with a
  `region` over a store (or `urlState` when the view should be shareable).
- Replace bespoke page lifecycles and query parsing with `definePage` and
  `urlState`.

## 0.7.1

- Kicker spacing applies once and not inside `PageHeader`.

## 0.7.0

- `LineChart` (telemetry), `BarChart` (grouped, stacked, horizontal, range) and
  `Sparkline`, with a six-hue chart palette (`--chart-*`) validated for
  colour-vision deficiency in both themes. Chart.js is an optional peer.
- Data tables copy as Markdown; shared `.ds-disclosure` style.
- `CopyButton` gains `text` and a settable `value`.
- `TimeSeriesChart` is deprecated: an API-compatible wrapper over `LineChart`.
- `.section-header` descriptions sit under the title.

## 0.6.x

- Dark theme and `ThemeSwitcher` (light / dark / system); `ThemeScript` keeps
  the theme across ClientRouter navigation.
