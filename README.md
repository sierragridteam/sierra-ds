# S.I.E.R.R.A design system

The shared Astro components, CSS tokens and browser UI primitives extracted from sierra-members. No frontend runtime framework is required.

## Local review

Use Node >=22.12 and npm. Run `npm install`, then `npm run dev` and open the URL Astro prints. The demo catalog includes typography, palette, forms, tables, states, shell patterns and interactive dialog/toast examples. Density and width controls support alternate configurations. Use your browser viewport controls to test actual media-query breakpoints.

`npm run check` checks the demo; `npm run build` produces its static site.

## Consume

Install a versioned release tarball from `releases/`. Import Astro components from `@sierra/design-system/components/Button.astro`, global CSS from `@sierra/design-system/styles/global.css`, and browser helpers from `@sierra/design-system/lib/controls` (also `dom`, `dialog`, `toast`). Render IconSprite once and supply a `#toasts` live region for toasts. Load Newsreader, IBM Plex Sans and IBM Plex Mono fonts as shown in the demo layout. Copy the package brand assets to `/brand/` in the consuming site's public directory.

The initial API preserves members' class names and appearance. App routing, authentication, boot behavior, data access and domain-specific renderers belong to consumers. Override CSS custom properties after the library stylesheet to configure a project. The default Logo retains the Members wordmark for compatibility.

## Releases and first consumer

Bump `packages/design-system/package.json`, run `npm run pack:library`, and commit the release. Copy it to members' `vendor/` and install that tarball there. This keeps CI independent of sibling repositories and avoids registry credentials. Never silently replace a released version. Members now consumes all extracted components, global styles and DOM helpers through this package.

See `docs/design-system.md` for inherited visual principles and token rationale.
