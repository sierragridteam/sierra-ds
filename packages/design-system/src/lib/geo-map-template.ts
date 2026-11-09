/** Markup for <sierra-geo-map>; separate so server rendering never loads MapLibre. */
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { html, nothing } from "lit-html";
import { repeat } from "lit-html/directives/repeat.js";
import { callout } from "./ui";

export interface GeoMapProps {
  data: FeatureCollection<Geometry | null>;
  label: string;
  compact?: boolean;
  basemap?: boolean;
  /** Disable feature selection for an overview; pan and zoom remain. */
  selectable?: boolean;
  /**
   * The button list under the map that selects features by keyboard. Defaults to
   * `selectable`. Turn it off only when the page already lists the same features
   * and selecting there drives `map.selected` (e.g. a feed), so keyboard and
   * screen-reader users have the same path; the selection is still announced.
   */
  featureList?: boolean;
  /**
   * Name points and lines on the map, as the website's maps do: uppercase,
   * halo in the land colour, hidden where they would collide. Uses the
   * feature's `shortLabel`, else `label`. "selected" labels only the selection.
   */
  labels?: boolean | "selected";
  selected?: number;
}

const featureLabel = (f: Feature<Geometry | null>, i: number) =>
  String(f.properties?.label ?? `Feature ${i + 1}`);

export function geoMapTemplate(p: GeoMapProps) {
  const selectable = p.selectable !== false;
  const list = selectable && p.featureList !== false;
  const features = p.data.features;
  const unlocated = features.filter((f) => !f.geometry);
  const chosen = p.selected !== undefined ? features[p.selected] : undefined;
  return html`<div class="ds-map-canvas" role="region" aria-label=${p.label}></div>
    <p class="ds-map-fallback" role="status">Loading map.</p>
    ${list
      ? html`<div class="ds-map-feature-list" aria-label="Map features">
          ${repeat(
            features,
            (_, i) => i,
            (f, i) => html`<button type="button" class="btn btn--outline btn--sm" data-feature-index=${i} aria-pressed=${String(p.selected === i)}>
              ${featureLabel(f, i)}${f.geometry ? nothing : " · unlocated"}
            </button>`,
          )}
        </div>`
      : html`<ul class="sr-only" aria-label="Map features">
          ${features.map((f) => html`<li>${f.properties?.label}: ${f.properties?.description}</li>`)}
        </ul>`}
    <p class=${list ? "ds-map-fallback" : "sr-only"} ?hidden=${!selectable} data-selection aria-live="polite">
      ${chosen
        ? `${chosen.properties?.label ?? "Feature"} — ${chosen.properties?.description ?? (chosen.geometry ? chosen.geometry.type : "Location unavailable")}`
        : "Select a feature on the map or in the list."}
    </p>
    ${!selectable && unlocated.length
      ? html`<div class="ds-map-notice">
          ${callout(
            html`<p>These records have no coordinates and cannot be placed on the map.</p>
              <ul>${unlocated.map((f) => html`<li>${f.properties?.label ?? "Unnamed report"}</li>`)}</ul>`,
            { tone: "brass", title: "Reports without a location" },
          )}
        </div>`
      : nothing}
    ${p.basemap
      ? html`<p class="ds-map-attribution">
          <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>
          · <a href="https://openfreemap.org/">OpenFreeMap</a>
        </p>`
      : nothing}`;
}

