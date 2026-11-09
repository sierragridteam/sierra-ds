# Design system — S.I.E.R.R.A Members

> **Source of truth:** `src/styles/tokens.css` (values) and `/styleguide` (rendered reference).
> The parent system is the main site's "Civic Direction" v1.0 (`dpup/sierragridteam.org`,
> `docs/design/design-system.html`). This document explains what was inherited, what changed
> for the app, and why.

## 1. Relationship to the main site

The public site reads as an established civic institution: parchment, forest green, brass,
serif everywhere, square corners, no shadows, generous whitespace. Members arrive here from
that site, so the two must feel like one organisation. But this is a tool, not a brochure. A
member's job is to find a file, check a roster, approve a request. The derivative keeps the
brand and re-tunes the ergonomics.

| Aspect     | Main site                                         | Members app                                                                                          | Why                                                                                  |
| ---------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Palette    | parchment surfaces, green/brass/orange, tan lines | **identical**, plus three tints (`--brand-green-tint`, `--brand-brass-tint`, `--signal-orange-tint`) | Selection and status grounds need a fill lighter than the accent itself              |
| Typefaces  | Newsreader, IBM Plex Sans, IBM Plex Mono          | **identical**, self-hosted via fontsource                                                            | Continuity                                                                           |
| Body face  | Newsreader (serif)                                | **IBM Plex Sans**                                                                                    | Denser UI reads better in sans; serif stays for h1/h2 so pages still carry the voice |
| Type scale | hero 40–54px, h2 28–36px                          | h1 26–32px, h2 22px, body 16, UI 14, small 13                                                        | App pages are lists, not headlines                                                   |
| Labels     | 11–12px uppercase, 0.16em                         | same, tracking 0.14em                                                                                | Slightly tighter at small sizes in denser rows                                       |
| Corners    | 0px                                               | **2px controls, 4px cards**                                                                          | A hint of softness reads "interface"; still far from a consumer app                  |
| Shadows    | overlays only                                     | overlays and the mobile drawer only                                                                  | Cards stay flat                                                                      |
| Spacing    | 4/8/12/14/18/26/48/64/72/96                       | **4/8/12/16/20/24/32/40/48/64**                                                                      | A regular 4px grid is easier to compose UI on                                        |
| Layout     | centred sections, 1280px container                | **sidebar shell**, 960px content column                                                              | Navigation is persistent in a tool                                                   |
| Dark mode  | none                                              | none                                                                                                 | Same decision; tokens are structured so one could be added later                     |
| Orange     | risk only, Donate exception                       | risk and destructive actions only (`.btn--danger`, suspended state)                                  | Same rule, app vocabulary                                                            |

## 2. Tokens

All in `src/styles/tokens.css`. Groups: surfaces, ink, brand & signal, state colours, lines,
typography (faces, sizes, weights, leading, tracking), geometry (radii, spacing, control
heights), layout (shell dimensions, z-index), shadows, motion.

Rules:

- **Only `tokens.css` may contain raw hex colours.** `stylelint` (`color-no-hex`, `color-named`)
  fails the build otherwise; see `.stylelintrc.json`. Raw px font sizes belong there too, by
  convention (not lint-enforced).
- **Never grey.** Lines are tan (`--line`, `--line-soft`, `--line-control`); disabled states use
  opacity, not grey.
- **Contrast.** Text tokens meet WCAG AA on every surface they are paired with in the style
  guide. `--line-control` is ≥ 3:1 against inputs. Brass and orange _text_ use the darkened
  `-text` variants; the base accents are for rules and fills only.
- **Text on fills.** Filled green and orange controls use `--ink-on-brand`, never a surface
  token: in dark mode the fills lighten and their text darkens.
- **Motion** is one duration (`--transition`, 120ms) plus a slower one for the drawer; both
  collapse to 0 under `prefers-reduced-motion`.

### Light and dark themes

Light is the default and is unchanged. Every colour token, plus the colour-derived `--border`,
`--border-soft` and shadow tokens, is defined in a light block and a dark block at the end of
`tokens.css`. `data-theme` on `<html>` selects `light`, `dark` or `system` (follow
`prefers-color-scheme`); without the attribute pages stay light, so existing consumers are
unaffected until they opt in. `data-theme="light"` or `"dark"` on any element scopes a theme to
that region, which paints its own ground.

The dark palette is "night forest": green-black grounds that get lighter, not greyer, as they
rise (page → card → banner → raised; the deep toast ground sits above them all). Ink is
parchment. Green, brass and orange are lifted so they keep their roles as text and rules, and
fills carry dark `--ink-on-brand`. The raster mark is never recoloured; dark themes seat it on
a parchment plate (`--logo-plate`). Map grounds have dark values, MapLibre's dark control icons
are inverted, and `GeoJSONMap` rebuilds when the resolved theme changes because MapLibre needs
literal colours.

`tests/theme-tokens.test.mjs` keeps the explicit and system dark blocks identical, requires a
dark value for every light token, and checks the text/control contrast pairs in both themes.
Status dots are not in that list because they always sit beside a label (the inherited light
brass dot is below 3:1 on cards).

## 3. Type roles

| Role           | Face       | Size                          | Weight                  | Use                                                        |
| -------------- | ---------- | ----------------------------- | ----------------------- | ---------------------------------------------------------- |
| h1             | Newsreader | `--fs-h1`                     | 500                     | Page title, one per page                                   |
| h2             | Newsreader | `--fs-h2`                     | 500                     | Section headings on a page                                 |
| h3/h4          | Plex Sans  | `--fs-h3`                     | 600                     | Card titles, sub-groups                                    |
| Lead           | Plex Sans  | `--fs-lead`                   | 400                     | Sentence under a page title                                |
| Body           | Plex Sans  | `--fs-body`                   | 400                     | Notes, callouts, prose                                     |
| UI             | Plex Sans  | `--fs-ui`                     | 400/500                 | Rows, table cells, nav, buttons' neighbours                |
| Small / meta   | Plex Sans  | `--fs-small`                  | 400                     | Help text, timestamps                                      |
| Label / kicker | Plex Sans  | `--fs-label`, `--fs-label-lg` | 600, uppercase, tracked | Form labels, table heads, badges, buttons, kickers (brass) |
| Data           | Plex Mono  | inherits                      | 400/500                 | Call signs, codes, sizes, times                            |

Copy follows the main site's style guide: sentence-case statement headlines, no exclamation
marks, "S.I.E.R.R.A" with periods, 24-hour PT times, `·` as a meta separator.

## 4. Components

Two layers, on purpose:

1. **Global classes in `src/styles/components.css` and `src/styles/shell.css`.** Most member
   UI is rendered in the browser from data, and client-rendered DOM cannot use Astro's scoped
   styles. So the vocabulary is global: `.btn`, `.card`, `.list`/`.row`, `.table`, `.badge`,
   `.field`/`.input`, `.callout`, `.empty`, `.skeleton`, `.toast`, `.stats`/`.stat`, `.dl`,
   `.crumbs`, `.toolbar`, `.user-chip`/`.avatar`, the admin editors (`.dialog`, `.steps`,
   `.choices`/`.choice`, `.md-editor`, `.picker`), `.prose` for rendered Markdown, and the shell (`.sidebar`, `.nav-link`,
   `.topbar`, `.main`, `.auth`).
2. **Thin Astro wrappers in `src/components/`** for authoring static markup: `Button`,
   `Card`, `Field`, `Badge`, `Callout`, `EmptyState`, `PageHeader`, `Icon`, `Logo`. They emit the
   global classes and nothing else, so static and dynamic markup look the same.

Client code builds nodes with `el()` and `icon()` from `src/lib/dom.ts` and the same classes.

### Rules that keep it coherent

- One primary button per view. Secondary is brass outline; ghost for low-emphasis; outline for
  neutral toggles; danger (orange) only for suspend/remove, and always with a confirm step.
- Rows are 48px; the leading icon is muted and turns green on hover; a trailing chevron means
  navigation, a download icon means a file, an external icon means a new tab.
- Tables never scroll sideways on a phone. Add `.table--cards` and, below 600px, each row
  becomes a dense card: the `.is-primary` cell on the first line, the other cells inline beneath
  it (`.is-blank` cells hide, a `data-label` prefixes the value, e.g. "Joined"), and the
  `.is-actions` buttons share a full-width row of tap targets. A lone action sits beside the
  primary cell instead.
- Badges carry a status dot (ok / elevated / alarm / muted). The deep badge (dark ground, brass
  dot) marks roles, not states.
- Nothing is ever blank: the boot screen (mark and a thin sweeping bar on the hero grid, faded
  in after a short delay) while auth resolves, skeleton rows while data loads, then content or an
  `.empty` state with a sentence and, where useful, one action.
- Errors are inline (`.form__error`, `.field__error`) when they belong to a form, toasts when
  they belong to an action. Never `alert()`.
- Icons are a 24px stroke set in `src/components/IconSprite.astro`; add there, use everywhere.
- Admin editing happens in a modal `.dialog` (native `<dialog>`, so focus and Escape come from
  the browser). Anything with more than one decision is a wizard: a `.steps` stepper, one
  question per step, choice cards (`.choice`) for "pick one", and a review step that shows the
  result with the same renderer members see. Closing a dialog with unsaved changes takes a
  second Escape or click ("Discard changes"), never `confirm()`.
- Notes are Markdown, rendered by `src/lib/markdown.ts` (GFM, single line breaks kept,
  DOMPurify, off-site links open in a new tab) into `.prose`. The editor's preview uses the
  same function.

### Charts

Chart colour encodes identity, nothing else. The six chart hues (lake, ochre,
manzanita, glacier, lupine, pine) are drawn from the Sierra landscape, kept
mid-tone so they read on parchment and night forest alike, and ordered so
neighbours stay distinct under protanopia and deuteranopia (OKLab ΔE ≥ 8, ≥ 15
for normal vision) and the first three are distinct in any combination.
`tests/charts.test.mjs` enforces this and 3:1 contrast on page, card and raised
surfaces. Signal orange and the state colours are never series colours.

Marks are thin: 2px lines, bars at most 24px thick with a 4px rounded data end,
area washes at 10%, recessive 1px gridlines, and labelled dashed thresholds.
Text on and around charts stays in ink tokens. Prefer a stat tile with a
sparkline over a chart with one bar or one number.

## 5. Shell

Desktop (> 860px): 240px sidebar on the banner surface with brand, grouped nav, and a user
chip; content column max 960px with `--gutter` side padding. Mobile: a 56px top bar with a
menu button opens the same sidebar as a drawer (the only shadowed element besides popovers).
Auth screens (`AuthLayout`) drop the shell for a centred 420px card on the hero tint with the
main site's faint surveyed grid.

Moving between pages keeps the sidebar and top bar in place; only the content column changes,
with a short fade out and a slightly longer fade-and-lift in (none under reduced motion). A
page fetch slow enough to notice shows a 2px brand-green sweep along the top of the viewport.

Admin-only navigation is present in the HTML but hidden until the profile confirms the role;
this is presentation, not security (RLS decides what an admin can actually do).

## 6. Changing things

- New token: add to `tokens.css` with a comment on its role, use it, add it to the style guide,
  note it here if it changes a rule above.
- New component: add the global class(es) with a section in `components.css`, an example on
  `/styleguide`, and an Astro wrapper only if static pages need it.
- Removing a class: grep `src/lib` too; client code references classes by string.
- New colour token: give it a value in the light block and both dark blocks; the theme test
  fails otherwise. Check it in dark mode on the demo pages.
- Run `make lint` — the token guardrail is the one check that protects the palette.
