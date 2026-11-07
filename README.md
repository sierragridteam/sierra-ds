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
