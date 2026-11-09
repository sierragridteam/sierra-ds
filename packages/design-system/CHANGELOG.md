# Changelog

## 0.8.3

Guardrails from a wide-screen review of a data app's overview: layouts an app
gets right by using the system's classes.

- Shell: `.main__inner` starts beside the sidebar instead of centring (visible
  for members on wide screens). New `.main__inner--wide` (`--content-wide`,
  1480px) for dashboards.
- Map zoom controls are themed for `createGeoMap()` elements as well as the
  Astro frame; dark mode no longer shows white MapLibre buttons.
- A map in a panel's `media` slot grows to fill an equal-height row.
- Flow spacing: blocks nested inside a panel body or banner aside (in an app's
  wrapper or region host) keep the system rhythm.
- Banner attention items: a long title wraps beside its badge, aligned to the
  first line.
- `.sidebar__footer` plain text reads as a caption.
- Browser fixture `compat/composition` covers each case.

## 0.8.2

Fixes from an adversarial review and a clean-room build of a page from the
package alone.

- Elements render when props arrive after they are attached, or before they
  are defined (props set by a template before `define*()`).
- Keyed list moves keep element instances: charts and maps are no longer
  rebuilt when a region reorders them.
- `<sierra-sparkline>` is a full element (`props`, `values`, `createSparkline`);
  repeated updates and updates inside regions work.
- `region()` can be created again on a container; one failing store subscriber
  no longer stops the others.
- `urlState` only rewrites the URL in place. The `push` option is removed: under
  the ClientRouter it turned back/forward into full page loads.
- `feedItem({ onSelect })`: the whole row selects, the title link stays the
  keyboard path and carries `aria-current`.
- `card()` renders the same element as `Card` (`as`, `class`); panels are
  `<section>`. Elements add their own host classes.
- `MoreLink` accepts its text as content. `formatTimestamp()` adds the zone.
- Map: labels flip left at the edge, the selection is announced when the
  feature list is off, the canvas is a named region, selection no longer resets
  the data source.
- Forced-colours selection states; stronger selected segment; segmented
  controls wrap; banner and links no longer overflow narrow screens; panels in
  region wrappers keep equal heights.
- README: complete list-detail-map example, stat tile markup, element
  registration, URL-state behaviour, times, map network needs.

## 0.8.1

- `GeoJSONMap`: feature labels in the website's treatment (`labels`,
  `shortLabel`), click selection with a pointer cursor, `featureList` to hide the
  duplicate button list, and an initial `selected`.
- `.cluster` / `.cluster--between` layout, and `.reading` + `reading()` for a
  value with its condition and icon. Weather icons: `cloud`, `cloud-sun`,
  `cloud-rain`, `cloud-snow`, `wind`.
- `ChoiceTiles size="compact"` uses its own `.choices--tiles` layout (name
  above, icon and value below); `.choices--compact` keeps its dialog layout.
- Badges inside `SummaryBanner` use a deep-ground treatment
  (`--state-*-on-deep` tokens).
- Feed items have more inset, so the selection bar has room.
- README: Astro scoped styles do not reach client-rendered markup.

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
