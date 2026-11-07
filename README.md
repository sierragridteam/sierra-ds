# S.I.E.R.R.A design system

The shared Astro components, CSS tokens and browser UI primitives extracted from sierra-members. No frontend runtime framework is required.

## Local review

Use Node >=22.12 and pnpm 10.26.0. Run `pnpm install`, then `pnpm run dev` and open the URL Astro prints. The demo catalog includes typography, palette, forms, tables, states, shell patterns and interactive dialog/toast examples. Density and width controls support alternate configurations. Use your browser viewport controls to test actual media-query breakpoints.

`pnpm run check` checks the demo; `pnpm run build` produces its static site.

## Consume

Install a versioned release tarball from `releases/`. Import Astro components from `@sierra/design-system/components/Button.astro`, global CSS from `@sierra/design-system/styles/global.css`, and browser helpers from `@sierra/design-system/lib/controls` (also `dom`, `dialog`, `toast`). Render IconSprite once and supply a `#toasts` live region for toasts. Load Newsreader, IBM Plex Sans and IBM Plex Mono fonts as shown in the demo layout. Copy the package brand assets to `/brand/` in the consuming site's public directory.

The initial API preserves members' class names and appearance. App routing, authentication, boot behavior, data access and domain-specific renderers belong to consumers. Override CSS custom properties after the library stylesheet to configure a project. Pass `<Logo siteName="Design system" />` to customize the site wordmark and accessible home link label. `siteName` defaults to `Members` for compatibility; an empty string hides the site wordmark.

## Releases and first consumer

Bump `packages/design-system/package.json`, run `pnpm run pack:library`, and commit the release. Copy it to members' `vendor/` and install that tarball there. This keeps CI independent of sibling repositories and avoids registry credentials. Never silently replace a released version. Members now consumes all extracted components, global styles and DOM helpers through this package.

See `docs/design-system.md` for inherited visual principles and token rationale.

pnpm is pinned in `package.json`. To activate it with Corepack, run
`corepack enable && corepack prepare pnpm@10.26.0 --activate`.
Commit `pnpm-lock.yaml`; CI installs with `pnpm install --frozen-lockfile`.
The workspace pins `@emnapi/runtime` to 1.11.3 because the 2.0 beta selected during
import is incompatible with Astro's WASM bridge. Revisit that override when upgrading Astro.

`Select.astro` provides a single-choice styled popover. Pass a unique `id`, an
`options` array of `{ value, label, disabled? }`, and an optional initial `value`.
Use `Field` with the same `for` value to label it. An optional `name` submits the
selected value through a hidden input. The trigger exposes `.value` and emits
bubbling `input` and `change` events. It supports arrow keys, Home/End, typeahead,
Enter/Space selection, Escape cancellation, and outside-click dismissal.

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

`CopyButton` owns clipboard behavior: pass `value` and an accessible `label`.
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
