/**
 * Templates: the markup of display components as functions of their props,
 * written with lit-html. The same function renders on the server (Astro, via
 * `toHTML` in `lib/ssr`) and in the browser (`region`, `renderInto`), so a
 * component's markup has one source.
 *
 * Re-exported here so consumers depend on the design system, not on lit-html
 * directly, and get the same version the components use.
 */
export { html, svg, nothing, render, type TemplateResult } from "lit-html";
export { repeat } from "lit-html/directives/repeat.js";
export { classMap } from "lit-html/directives/class-map.js";
export { styleMap } from "lit-html/directives/style-map.js";
export { ifDefined } from "lit-html/directives/if-defined.js";
export { live } from "lit-html/directives/live.js";
export { ref, createRef } from "lit-html/directives/ref.js";
export { keyed } from "lit-html/directives/keyed.js";
