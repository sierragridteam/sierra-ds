/**
 * Server rendering of design-system templates for Astro components:
 *   <Fragment set:html={toHTML(feedItem(props))} />
 * Server only: import it in component frontmatter, never in browser code.
 * Lit's hydration markers are removed because elements re-render on connect.
 */
import { render } from "@lit-labs/ssr";
import { collectResultSync } from "@lit-labs/ssr/lib/render-result.js";
import type { TemplateResult } from "lit-html";

const MARKERS = /<!--\/?lit-(?:part|node)[^>]*-->|<\?>/g;

export function toHTML(template: TemplateResult): string {
  return collectResultSync(render(template)).replace(MARKERS, "");
}
