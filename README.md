# S.I.E.R.R.A design system

The shared Astro components, CSS tokens and browser UI primitives extracted from sierra-members. No frontend runtime framework is required.

Usage documentation for consumers lives in the package: [packages/design-system/README.md](packages/design-system/README.md)
and [CHANGELOG.md](packages/design-system/CHANGELOG.md). Both ship with the npm package.

## Local review

Use Node >=26.13.0 and pnpm 12.18.0. Run `pnpm install`, then `pnpm run dev` and open the URL Astro prints. The demo catalog includes light/dark themes, typography, palette, forms, tables, states, shell patterns and interactive dialog/toast examples. Density and width controls support alternate configurations. Use your browser viewport controls to test actual media-query breakpoints.

`pnpm run check` checks the demo; `pnpm run build` produces its static site.

## Consume

Install with `pnpm add @sierragridteam/design-system`. Import Astro components from `@sierragridteam/design-system/components/Button.astro`, global CSS from `@sierragridteam/design-system/styles/global.css`, and browser helpers from `@sierragridteam/design-system/lib/controls` (also `dom`, `dialog`, `toast`). Render IconSprite once and supply a `#toasts` live region for toasts. Load Newsreader, IBM Plex Sans and IBM Plex Mono fonts as shown in the demo layout. Copy the package brand assets to `/brand/` in the consuming site's public directory.

The initial API preserves members' class names and appearance. App routing, authentication, boot behavior, data access and domain-specific renderers belong to consumers. Override CSS custom properties after the library stylesheet to configure a project. Pass `<Logo siteName="Design system" />` to customize the site wordmark and accessible home link label. `siteName` defaults to `Members` for compatibility; an empty string hides the site wordmark.

## Releases and first consumer

Every push to `main` publishes to npm after tests, type checks, and the demo
build pass, including documentation-only merges. `publish.yml` queues releases
without cancelling earlier merges. GitHub authenticates using npm trusted
publishing (OIDC); no npm token is stored in GitHub.

The package version in source is the minimum release version. CI selects the
next unused patch above the highest stable npm version, or uses the source
version when it is higher. To make a minor or major release, raise the source
version in your PR. CI changes the version only in its checkout, so releases do
not create bot commits or trigger another release. Each npm version records
its source commit; rerunning an already published commit is a no-op.

Use the Publish workflow's manual dispatch on `main` to retry a failed release.
A registry error fails the workflow rather than guessing a version. Consumers
update their npm dependency explicitly; tarballs are no longer copied into
consumer repositories.

The workflow waits for npm to expose a processed package before selecting a
version, and holds the release queue until its publication becomes visible.
If npm processing exceeds the wait limit, rerun the workflow once it finishes.

Initial setup requires publishing the package once, then authorizing the npm
trusted publisher for `sierragridteam/sierra-ds`, workflow `publish.yml`, with
publish permission and no environment name.

See `docs/design-system.md` for inherited visual principles and token rationale.

pnpm is pinned in `package.json`. Install it with `npm install --global pnpm@12.18.0`.
Commit `pnpm-lock.yaml`; CI installs with `pnpm install --frozen-lockfile`.
The workspace pins `@emnapi/runtime` to 1.11.3 because the 2.0 beta selected during
import is incompatible with Astro's WASM bridge. TypeScript stays on the latest supported 6.x release because Astro check does not
yet support TypeScript 7. Map components require MapLibre GL 6 starting in 0.4.0.

`Select.astro` provides a single-choice styled popover. Pass a unique `id`, an
`options` array of `{ value, label, disabled? }`, and an optional initial `value`.
Use `Field` with the same `for` value to label it. An optional `name` submits the
selected value through a hidden input. The trigger exposes `.value` and emits
bubbling `input` and `change` events. It supports arrow keys, Home/End, typeahead,
Enter/Space selection, Escape cancellation, and outside-click dismissal.

## Dark mode and theme switching (0.6)

Light remains the default. To offer dark mode, render `ThemeScript` in `<head>`
and a `ThemeSwitcher` wherever people set preferences (the header in the demo):

```astro
---
import ThemeScript from '@sierragridteam/design-system/components/ThemeScript.astro';
import ThemeSwitcher from '@sierragridteam/design-system/components/ThemeSwitcher.astro';
---
<head><ThemeScript /></head>
<!-- … -->
<ThemeSwitcher compact />
```

The preference is `data-theme` on `<html>`: `light`, `dark` or `system` (follow
the operating system). `ThemeScript` applies the stored choice before first paint;
its `fallback` (default `system`) applies when nothing is stored and `<html>` has
no valid `data-theme`. Without `ThemeScript` or the attribute, pages stay light.
Sites using Astro's `ClientRouter` keep the theme across navigations:
`ThemeScript` copies it onto the incoming document before each swap.
The choice is stored in `localStorage` under `sierra-theme`, so it is per origin;
pass the same `storageKey` to both components to change it.

`ThemeSwitcher` is a native radio group (Light, Dark, System) with arrow-key
navigation. `compact` shows icons only; `label` sets the group's accessible name.
It is hidden until its script runs. Multiple switchers, other tabs and OS changes
stay in sync. `data-theme="light"` or `"dark"` on any element themes just that
region.

`lib/theme` exports `getThemeState()` (`{ preference, theme }`),
`setThemePreference()`, `resolveTheme()`, `readStoredThemePreference()` and
`onThemeChange(callback, { signal })` for canvas/WebGL output that must
re-read tokens. `GeoJSONMap` already rebuilds on theme changes. Project overrides
of colour tokens must now cover both themes; filled controls use the new
`--ink-on-brand` token rather than `--surface-page`.

## Data and maps

Open `/data` in the demo for synthetic road/source tables, five data states,
filter controls, and a single map showing point, line and polygon treatments together.
These are library examples, not a migrated `sierra-data` site or a prescribed page layout.

- `DataTable` supplies semantic column headings, caption and a scrollable region;
  consumers slot `DataRow` components and own filtering/sorting/pagination. Use
  `ds-numeric` for numeric cells. Pass record-level notices through `DataRow.note`.
- `DataStatus` distinguishes loading, fresh, stale, unavailable and empty. Consumers
  decide when to retain last-good data; unknown counts must not become zero.
- `FilterBar` arranges labelled controls; it does not own query or URL state.
- `MapFrame` provides toolbar, legend, attribution and caption slots.
- `GeoJSONMap` accepts a GeoJSON FeatureCollection (including null geometry), a label,
  and optional `compact` / `basemap` flags. Set `selectable={false}` for a treatment overview without feature buttons; pan and zoom remain available. Features can supply `label`, `description`
  and `tone` (`alarm`, `brass`, or default green). `feature-select` emits the feature
  and index. Every feature has a keyboard-accessible selection button, including
  unlocated records. `GeometryPreview` is its compact, geometry-only variant.

Maps require the optional `maplibre-gl` peer. Only pages importing map components
load the engine. `basemap` opts into OpenFreeMap requests and visible attribution;
otherwise no tiles are fetched. Basemap failures retain geometry with an explicit
notice; WebGL failures retain the feature list. The shared restyling function and
map palette derive from `sierragridteam.org/src/lib/basemap-style.ts` and its map
colors only. No page styles from either site were adopted. Map status, data-source
status, and hazard severity remain separate. The data site's hazard-map suppression
policy, API fetching, polling and URL state belong to its consuming application.

Current scope: initial/static GeoJSON props, point selection emphasis, and list
selection events. Advanced layer controls, camera URL persistence, dynamic data
updates and domain-specific feature details are subsequent work. Existing consumers
remain on their packaged release until an explicit library release/migration.

## Dense records

The `/data` catalog displays states side by side, with no filter configuration
required. Its dense-data examples are synthetic and inspired by the shape of
`sierra-data`'s event detail, without importing that site's styles.

- `ValueTable`: `label` and `rows` of `{label, value?, description?, missing?}`.
  Values support JSON. Secondary descriptions sit beneath values; long IDs wrap.
  `undefined` means missing; `null`, `false`, zero and an empty string are distinct.
- `MetricGrid`: `label` and `items` of `{label, value?, unit?, description?, missing?}`.
  Null/undefined use the missing label; zero is a valid reading. Measurement origin
  belongs in the description (for example gateway-reported versus device-measured).
- `IdentifierList`: `label`, `values`, optional `previewCount` and `emptyMessage`.
  Full IDs remain readable and selectable. Overflow uses a disclosure. Individual
  copy and Copy all use complete values; Copy all includes collapsed entries, one
  per line. Clipboard failures show a manual-copy fallback.
- `DataDiff`: `label`, `changes`, and optional `emptyMessage`. Changes contain
  `path`, `kind` (added/removed/changed), and `before`/`after` JSON values.
  It wraps full values and labels change direction in words, not color alone.
  Optional `diffValues(before, after)` from `lib/data-values` computes changes for
  JSON values, using escaped JSON Pointer paths and index-based array comparison.
  Revision fetching and domain-specific comparison policies stay with consumers.

Run `pnpm test` for value and diff semantics; `pnpm check` includes the library
components as well as the demo. Table-specific notices should live within their
own row, beneath the relevant label/value, rather than as detached status banners.

`DataRow` takes `label`, optional `description`, `note` and `noteTone`
(`neutral` or `caution`), with remaining `<td>` cells in its slot. It owns the
row header and note placement: annotations stay inside the record's header cell,
including on narrow screens. Do not create separate colspan rows for a record's
advisory. Use `DataStatus` for an entire dataset's state instead.

`CopyButton` owns clipboard behavior: pass `value` and an accessible `label`; the copy icon turns into a tick and "Copied." is announced. Pass `text` for a visible label (keep `label` starting with it), and set `element.value` to change what is copied after render.
The icon changes to a check only after the write succeeds, resets after 1.8 seconds,
and preserves button dimensions. Failure shows an explicit manual-copy message.
`IdentifierList` composes this control for individual and bulk copies.

`DataDiff` aligns field names beside flowing old → new values, with muted struck
old values, plus signs for additions, and explicit removal text. Narrow containers
stack the field above its change. `ValueTable` should sit in `Card padded={false}`
so its hover and dividers reach the card edges.

Demo pages share `demo-site/src/layouts/DemoLayout.astro`: one header, primary
navigation, section navigation, content width and responsive shell.

## License and usage

Copyright © 2026 Signal Integrity & Emergency Radio Response Alliance. All rights
reserved. This design system is derived from the organization's website and
members site; public source availability does not grant permission to reuse the
code, design, name, or brand assets. Third-party dependencies retain their own
licenses. Contact `info@sierragridteam.org` for permission.

## Time series (deprecated in 0.7)

`TimeSeriesChart` keeps its 0.5 API (the same props, the `<sierra-time-series>`
element with `options` and `series`, UTC labels and the semantic table) but now
renders through `LineChart`, so it needs `chart.js` and looks like the other
charts. Rejected updates still leave the previous chart in place. The SVG
renderer (`lib/time-series-render`) is removed. Use `LineChart` for new work;
the wrapper will be removed in a later minor release.

## Charts (0.7)

`LineChart.astro` (telemetry over time), `BarChart.astro` (grouped, stacked,
horizontal or low–high range bars, e.g. weather) and `Sparkline.astro` share one
palette and one set of rules. Line and bar charts draw with Chart.js 4, an
optional peer dependency: run `pnpm add chart.js` in a consumer that uses them.
Sparklines are server-rendered SVG and need no JavaScript or Chart.js.

```astro
<LineChart label="Node battery voltage" unit="V" decimals={2}
  series={[{ id: "ebbetts", label: "Ebbetts Pass relay", points }]}
  maxGapMs={30 * 60_000} thresholds={[{ value: 3.5, label: "Low battery" }]} />
<BarChart label="Daily precipitation" unit="in" categories={days}
  series={[{ id: "precip", label: "Precipitation", color: "lake", values }]} />
<Sparkline label="Temperature, last 24 hours" values={temps} unit="°F" />
```

- Times are epoch milliseconds; labels use a 24-hour clock in `timeZone`
  (default `America/Los_Angeles`). Ticks land on local hours and midnights,
  including across daylight-saving changes. `formatChartDay()` makes day labels
  for bar categories.
- A `null` value, or a gap longer than `maxGapMs`, breaks the line. Isolated
  samples get a dot; the latest sample is marked.
- Series take `--chart-lake`, `-ochre`, `-manzanita`, `-glacier`, `-lupine` and
  `-pine` in that order. Pass `color` to pin an entity to a hue. A seventh series
  falls back to `--chart-other`; fold extra series or split the chart instead.
  Series colours mean identity only; status keeps the badge colours.
- Every chart renders a caption, a text summary on the canvas and a data table
  on the server. Legends (two or more series) toggle series visibility.
- Update in the browser: `el.options = {...}` on either chart, `el.series = [...]`
  on a line chart, `el.appendPoints(id, points, { windowMs })` for live
  telemetry, and `el.values = [...]` on a sparkline. Charts recolour when the
  theme changes and inside `data-theme` regions.
- The pure model (`lib/chart-model`) builds the same tables, summaries and
  ticks without a DOM, for consumers that need them elsewhere.

Each chart's data table sits behind a "View data table" disclosure (the shared
`.ds-disclosure` style: a light chevron, no accidental text selection) with a
"Copy" button (named "Copy table as Markdown" for assistive tech). `tableToMarkdown()` produces the same Markdown.

`.section-header` puts a title and an optional action on one row; a description
paragraph always takes its own line underneath, so it can be any length.
