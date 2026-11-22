# Changelog

## 0.9.12

- `corridor()` takes `bands`: stretches of the route that something covers,
  such as chain control from its first checkpoint to its last, drawn in
  winter's colour in a lane of their own along the strip, on the strip's
  scale. Each band is `{ from, to, label, detail?, approximate? }`: the
  label (keep it short, e.g. "R2") sits by the bar, `detail` goes to its
  tooltip and screen readers, and `approximate` dashes the bar when the
  ends are estimated. Where the strip is horizontal the lane runs under the
  stop names, and with several bands every other label goes above its bar
  so short neighbours do not collide. Below about 34rem, where the strip
  turns vertical, the lane runs down beside the track, between it and the
  section labels, each label beside the middle of its bar (the lane is
  5.5rem, room for "Chains R2"; `--ds-corridor-band-lane` widens it);
  before, a page could only say it in words there. The lane is a list named by
  `bandsLabel` (default "Along <name>"). Nothing to migrate: a corridor
  without `bands` is unchanged.

## 0.9.11

- A map no longer changes height while it loads. `<sierra-geo-map>` showed
  its status ("Loading map.") in a line of its own under the canvas from
  the moment it was on the page until MapLibre had loaded, so a map was a
  line (49px) taller for that time and everything under it dropped and came
  back. The status is now a small note over the canvas's top-left corner,
  on its own surface so it reads over any ground in both themes; it takes
  no pointer events, the zoom controls stay bottom-right and the selection
  card draws above it. The lasting notices use the same note in the same
  place, so they do not move the page when they appear either: "Geometry
  only" when the basemap style fails or takes over five seconds, "Some map
  resources are unavailable" and "Interactive map unavailable". A map that
  loads with a notice showing fits its features below it.

  Migration: the status element is now `p.ds-map-status[role=status]`; it
  was `p.ds-map-fallback[role=status]`. Select it by role
  (`sierra-geo-map [role=status]`), which has not changed, as have its
  texts and its `hidden` state once the map has loaded. `.ds-map-fallback`
  remains the class of the selection line under the feature list.
  `sierra-geo-map` is now `position: relative`. A page that kept room for
  the status line under a map (a fixed or minimum height that included it)
  can drop that room: the element's height is the canvas plus the feature
  list, selection line and attribution it renders, in every state.

## 0.9.9

- An open `Select` list follows its trigger when the page (or a scrolling
  ancestor) scrolls, and closes once the trigger has been scrolled out of
  sight. Before, any scroll closed it, including ones the reader did not
  make: with the system's smooth scrolling, tabbing to a select below the
  fold scrolls it into view for about a second, and an arrow key pressed
  in that time opened the list only for the next scroll frame to close it
  (a second arrow key then reopened it, and Enter chose the current
  option instead of the one meant); a click that landed in the same frame
  as a scroll did the same. A scroll in an unrelated container no longer
  closes the list either. Nothing to migrate.

## 0.9.8

- Line and bar charts follow their container when it changes size as the
  opening animation ends. Chart.js holds a resize back while it animates and
  applies it on its next draw; a resize handled on the animation's last frame
  had no draw after it. The canvas kept its old width until a hover or new
  data, or a later resize was undone, and a canvas wider than its panel made
  the page scroll sideways (seen on a phone-width page whose chart had just
  appeared). The charts now draw once more when an animation ends. Nothing
  to migrate.

## 0.9.7

- Form controls are slightly rounder: inputs, selects, text areas, buttons,
  the Markdown editor and the select list use the new `--radius-control`
  token (4px, was `--radius-sm` at 2px). Badges and other small marks keep
  2px. Nothing to migrate; override the token to change it.

## 0.9.6

- `.filter-bar` gives its filter selects equal columns across the row, so a
  button keeps its size and place whatever is chosen (before, each was as wide
  as its choice and the row reflowed on every change).
- `SelectOption.short`: shorter text for the trigger when that option is
  chosen; the list still shows `label`. Use it where the full text does not
  fit an equal column.
- Reset is `.filter-reset`, a quiet text button for a line that is always
  there (the result count), not the filter row. `.filter-bar__reset` keeps the
  same look for 0.9.5 markup but no longer pushes itself to the row's end.

## 0.9.5

Search and filters above a list, and phone layouts from a pass over Grid on a
Pixel 9. Existing markup renders as before at wider widths; nothing to migrate.

- `searchField()` (lib/ui): a full-width search input with a magnifier, a
  clear button while it holds text, Escape to clear, and an optional key hint.
  `focusOnKey("/", …)` (lib/dom) wires the hint: it focuses the field unless
  the reader is already typing somewhere.
- `Select` / `createSelect` take `variant: "filter"`: a compact button sized
  to its choice, for a `.filter-bar` row. `label` names it for assistive tech
  ("Type: Mesh"), `prefix` shows that name inline, and `applied` marks a
  choice that narrows the list (stronger border, tinted fill). Its list is as
  wide as its longest option. `.filter-bar__reset` is the text button at the
  right end; render it only when something differs from the default.

Phone layouts (below 600px):

- `.table--cards.table--fields`: a new opt-in for tables whose columns are all
  facts about the row. Each row is a bordered card with the row header
  (`th[scope="row"]` or `.is-primary`) on top and one line per `data-label`
  cell, labels in a shared column. Without `.table--fields` the dense inline
  flow is unchanged.
- `segmented()` stays on one line and scrolls sideways when its options do not
  fit, instead of wrapping; the chosen option is brought into view. In a panel
  header the control moves under the title.
- `heatmap()` puts each row's name above its strip, so the strip gets the
  full width; the legend stays on one line.
- `SummaryBanner` aside lists put the badge above its title.
- `schedule()` in a narrow container: more room between rows, taller tracks,
  and names wrap instead of being cut.

## 0.9.4

- `SummaryBanner` in the light theme is a soft sage ground with ordinary ink,
  a brass kicker and green links, instead of the dark green band, which
  outweighed a light page. The dark theme is unchanged. Layout and markup are
  the same; nothing to migrate.

## 0.9.3

- `dayStrip()` is keyboard-focusable, so its sideways scroll is reachable
  without a pointer (axe `scrollable-region-focusable`).

## 0.9.2

- `GeoMap` zooms with a pinch or Ctrl/⌘ + wheel (MapLibre's cooperative
  gestures); before, the wheel was off and a trackpad pinch zoomed the whole
  page. A plain wheel or a one-finger drag still scrolls the page, and the
  map says so when you try.

## 0.9.1

- `corridor()` chain control markers draw as a snowflake in the light chart
  blue (`--chart-glacier`), whatever `tone` is passed: it is a winter
  condition, not a status.

## 0.9.0

Record views and app composition guardrails, from a review of Grid's overview
and event browser. Each case is covered by browser fixtures.

### Added

- `RecordHeader` / `recordHeader()`: the top of a selected record (badges,
  tags, serif title, place, source/time, `actions`). `closeLink()` closes a
  selection as a real link with a plain-click handler.
- `metricGrid()` client template (parity with `MetricGrid`), `size="compact"`
  for record details, and `identifiers` items rendered as pills.
  `identifierPills()` / `shortIdentifier()`: long hex values show six
  characters, with the full value as title and accessible name.
- `GeoMap` feature styling and motion: `tone` takes chart colours and
  `muted`; `weight`, `radius`, `opacity`, `z` per feature; `pulse` points
  get an expanding ring and `flow` lines moving dashes (static under reduced
  motion, `animate: false` to stop); `large` for a page-sized map;
  `fitFocus` fits to `focus` features and keeps the rest as context.
  Labelled maps fit with more edge room.
- `GeoMap` `card`: a themed card over the map beside the selected feature
  (at the click, or the point / line middle when chosen from a list); closes
  with its button, Escape or an empty-map click and fires `feature-clear`.
  Thin lines get a 14 px invisible hit area, and points win over lines
  under them.
- `elevationProfile()`: a route seen from the side — stops at their elevation
  on a slope (placed by distance when given), with levels such as the snow
  level drawn across, a band for where a level is heading (`range`,
  `rangeLabel`) and the ground above it tinted (`cover`). Every other
  caption drops under its dot when narrow.
- `dayStrip()`: days side by side with icon, high and low, a few words and
  the chance of precipitation; scrolls inside its panel when narrow.
- `GeoMap` feature `fill`: an area's fill opacity, apart from its outline's
  `opacity`.
- `GeoMap` point `maxZoom`: the point is drawn up to that zoom and gives way
  above it, e.g. to the area it stands for once the area is the bigger mark.
- `corridor()`: a route as a straight strip — sections coloured by state
  with travel text (hatched with `partial` when the status covers an
  unknown part), named stops, and work-zone / sign / closure / incident /
  camera markers. Vertical below about 34rem; an ordered list for screen
  readers.
- `corridor()` marker kind `chain`: a chain control checkpoint.
- `corridor()` markers are buttons with a card on hover, click or focus
  (`detail`, rich `card` content, `href` + `linkLabel`); Escape closes it.
  Signs draw as a small sign board in the chart blue (`tone: "info"`), and
  a marker on a stop's joint is nudged clear of it.
- `schedule()` readability: shaded day columns labelled at the top, row
  `group` headings, `planned` windows outlined so in-place ones stand out.
- `schedule()` windows are buttons with a card (time, `label`, `detail`,
  `href`).
- `schedule()`: planned windows on a shared time axis — one row per job,
  bars per window, local-midnight day ticks and a "now" line.
- `heatmap()`: rows × time grid with a single or two-colour ramp
  (`lowColor`), a 5th–95th percentile range by default, empty cells for
  missing data, and day ticks. `.dashboard` 12-column panel grid (`--span`).
- `.live-dot` indicator; `.ds-chart--quiet` hides a chart's caption visually
  inside a titled panel; table body row headers read as data, not labels.
- `trendList()`: small multiples, one row per measurement (label, latest
  value, detail, sparkline), coloured from the chart palette in turn. Stacks in narrow containers (a sidebar), one row
  from 30rem (container query).
- `<sierra-load-more>` (`lib/load-more`, `createLoadMore`): infinite scroll
  for paged lists. Fires `load-more` as its sentinel nears view inside the
  nearest scrolling ancestor or the page, again while a short page leaves it
  in view; `loading`/`hasMore`/`error` props drive it, an error stops
  automatic loading, and a real button (`auto: false` for button only) is
  always present.
- `Timeline` / `timeline()`: a record's key moments in time order; `state`
  past/now/future and `kind` source/system (the app's own record-keeping is
  quieter). `progress()`: a bar for stat tiles. `.stats--compact` for a
  record's callouts.
- `PropertyList` / `propertyList()`: record details as label/value rows with
  hairlines, in as many columns as fit; identifier lists as pills.
- `MessageSign` / `messageSign()`: one sign face with a bezel and amber text
  as drivers see it. Two- and three-page messages alternate every 3s with page
  dots (stacked under reduced motion); blank and out-of-service states; a
  location caption and `detail`. `--sign-face`, `--sign-text`,
  `--sign-text-off` tokens.
- `Stat` / `stat()`: a headline number tile; `href` + `actionLabel` put an
  arrow action at the top right and make the whole tile the link target.
- `DataDiff`: `count: false`; a small label; list values diff as removed/added
  pills with an unchanged count, including lists added or removed whole.

### Changed

- Shell: `.main__inner` starts beside the sidebar instead of centring (visible
  for members on wide screens). New `.main__inner--wide` (`--content-wide`,
  1480px) for dashboards.
- Map zoom controls are themed for `createGeoMap()` elements as well as the
  Astro frame; dark mode no longer shows white MapLibre buttons.
- A map in a panel's `media` slot grows to fill an equal-height row.
- Flow spacing: blocks nested inside a panel body or banner aside (in an app's
  wrapper or region host) keep the system rhythm.
- Banner attention items: badges in one column and titles in the next, so
  titles share a left edge and wrap beside their badge; a following
  `MoreLink` gets block spacing.
- `RecordHeader` titles size between h2 and h1, so long headlines stay calm.
- `.sidebar__footer` plain text reads as a caption.
- A panel body with nothing visible collapses instead of leaving padding.
- Map: the selected label moves to the left of its point near the right edge
  (it always draws, so MapLibre never flipped it).
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
