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
  selected?: number;
}

const featureLabel = (f: Feature<Geometry | null>, i: number) =>
  String(f.properties?.label ?? `Feature ${i + 1}`);

export function geoMapTemplate(p: GeoMapProps) {
  const selectable = p.selectable !== false;
  const features = p.data.features;
  const unlocated = features.filter((f) => !f.geometry);
  const chosen = p.selected !== undefined ? features[p.selected] : undefined;
  return html`<div class="ds-map-canvas" aria-label=${p.label}></div>
    <p class="ds-map-fallback" role="status">Loading map.</p>
    ${selectable
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
    <p ?hidden=${!selectable} class="ds-map-fallback" data-selection aria-live="polite">
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

