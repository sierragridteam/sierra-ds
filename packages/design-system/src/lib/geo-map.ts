/**
 * <sierra-geo-map>: GeoJSON points, lines and areas on a MapLibre map, themed
 * from tokens, with an accessible feature list.
 *
 *   const map = createGeoMap({ label: "Road reports", data: { type: "FeatureCollection", features: [] } });
 *   map.data = await loadReports();     // updates sources in place; the map is not rebuilt
 *   map.selected = 2;                   // emphasise a feature
 *   map.addEventListener("feature-select", (e) => show(e.detail.feature));
 *
 * Feature properties: `label`, `description`, and `tone` ("alarm" | "brass").
 */
import * as maplibregl from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { restyleBasemap, type StyleDoc } from "./basemap-style";
import { defineElement, SierraElement } from "./element";
import { getThemeState, onThemeChange } from "./theme";
import { geoMapTemplate, type GeoMapProps } from "./geo-map-template";

export type { GeoMapProps };

maplibregl.setWorkerUrl(workerUrl);

const located = (data: FeatureCollection<Geometry | null>) => ({
  type: "FeatureCollection" as const,
  features: data.features.flatMap((f, i) => (f.geometry ? [{ ...f, geometry: f.geometry, id: i }] : [])),
});

export class SierraGeoMap extends SierraElement<GeoMapProps> {
  map?: maplibregl.Map;
  #observer?: ResizeObserver;
  #loaded = false;
  #fitted?: string;
  #shown?: GeoMapProps["data"];
  #build?: AbortController;
  #frame = 0;

  protected template(p: GeoMapProps) {
    return geoMapTemplate(p);
  }

  get data() {
    return this.props.data;
  }
  /** Replace the features; the map keeps its instance and refits to the new bounds. */
  set data(data: FeatureCollection<Geometry | null>) {
    const keep = this.props.selected !== undefined && this.props.selected < data.features.length;
    this.update({ data, selected: keep ? this.props.selected : undefined });
  }
  get selected() {
    return this.props.selected;
  }
  set selected(index: number | undefined) {
    this.update({ selected: index });
  }

  protected connected(signal: AbortSignal) {
    this.addEventListener(
      "click",
      (event) => {
        const button = (event.target as Element).closest<HTMLElement>("[data-feature-index]");
        if (button) this.select(Number(button.dataset.featureIndex));
      },
      { signal },
    );
    // MapLibre needs literal colours, so rebuild the map when the theme flips.
    let theme = getThemeState().theme;
    onThemeChange(
      (state) => {
        if (state.theme === theme) return;
        theme = state.theme;
        this.teardown();
        void this.build(signal);
      },
      { signal },
    );
    void this.build(signal);
  }

  protected disconnected() {
    this.teardown();
  }

  protected updated(p: GeoMapProps) {
    this.classList.add("ds-geo-map");
    this.classList.toggle("ds-map-compact", !!p.compact);
    this.classList.toggle("ds-map-large", !!p.large);
    if (!this.map || !this.#loaded) return;
    // A selection change only restyles; new data replaces the source and refits.
    if (p.data !== this.#shown) {
      this.#shown = p.data;
      const source = this.map.getSource("features") as maplibregl.GeoJSONSource | undefined;
      source?.setData(located(p.data) as GeoJSON.FeatureCollection);
      this.fit(p.data);
    }
    this.emphasise(p.selected);
  }

  private select(index: number) {
    const feature = this.props.data.features[index];
    if (!feature) return;
    this.selected = index;
    this.dispatchEvent(new CustomEvent("feature-select", { detail: { feature, index }, bubbles: true }));
  }

  private emphasise(index: number | undefined) {
    const map = this.map;
    if (!map?.getLayer("ds-points")) return;
    const id = index ?? -1;
    const radius: maplibregl.ExpressionSpecification = ["coalesce", ["get", "radius"], 6];
    map.setPaintProperty("ds-points", "circle-radius", ["case", ["==", ["id"], id], ["*", radius, 1.6], radius]);
    const points: maplibregl.FilterSpecification = ["==", ["geometry-type"], "Point"];
    if (map.getLayer("ds-label-selected")) {
      map.setFilter("ds-label-selected", ["all", points, ["==", ["id"], id]]);
      this.placeSelectedLabel();
    }
    if (map.getLayer("ds-labels") && this.props.labels !== "selected")
      map.setFilter("ds-labels", ["all", points, ["!=", ["id"], id]]);
  }

  /**
   * The selected label always draws (it may overlap), so MapLibre keeps it in
   * its first anchor even at the map edge. Put it on the side with room.
   */
  private placeSelectedLabel() {
    const map = this.map, feature = this.props.selected !== undefined ? this.props.data.features[this.props.selected] : undefined;
    if (!map?.getLayer("ds-label-selected") || feature?.geometry?.type !== "Point") return;
    const [lng, lat] = feature.geometry.coordinates as [number, number];
    const x = map.project([lng, lat]).x, width = map.getCanvas().clientWidth;
    map.setLayoutProperty("ds-label-selected", "text-variable-anchor", x > width * 0.55 ? ["right", "left"] : ["left", "right"]);
  }

  /**
   * Pulse rings and moving dashes, ~30 fps, paused with the tab (rAF). Under
   * reduced motion (or `animate: false`) the ring and dashes stay still.
   */
  #animate(map: maplibregl.Map, signal: AbortSignal) {
    if (this.props.animate === false || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // The dash sequence that reads as travel along the line (MapLibre's ant path).
    const dashes = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];
    let last = 0, step = -1;
    const tick = (now: number) => {
      if (signal.aborted || !this.map) return;
      if (now - last > 33) {
        last = now;
        const t = (now % 2000) / 2000;
        if (map.getLayer("ds-pulse")) {
          map.setPaintProperty("ds-pulse", "circle-radius", ["+", ["coalesce", ["get", "radius"], 6], 2 + t * 14]);
          map.setPaintProperty("ds-pulse", "circle-opacity", 0.45 * (1 - t));
        }
        const next = Math.floor(now / 60) % dashes.length;
        if (next !== step && map.getLayer("ds-flow")) {
          step = next;
          map.setPaintProperty("ds-flow", "line-dasharray", dashes[step]);
        }
      }
      this.#frame = requestAnimationFrame(tick);
    };
    this.#frame = requestAnimationFrame(tick);
  }

  private fit(data: FeatureCollection<Geometry | null>) {
    // Refit only when the set of geometries changes, not on selection.
    const key = JSON.stringify(data.features.map((f) => f.geometry));
    if (!this.map || key === this.#fitted) return;
    this.#fitted = key;
    const bounds = new maplibregl.LngLatBounds();
    const positions = (value: unknown): void => {
      if (!Array.isArray(value)) return;
      if (typeof value[0] === "number" && typeof value[1] === "number") bounds.extend([value[0], value[1]]);
      else value.forEach(positions);
    };
    const geometry = (g: Geometry): void => {
      if (g.type === "GeometryCollection") g.geometries.forEach(geometry);
      else positions(g.coordinates);
    };
    const focused = this.props.fitFocus ? data.features.filter((f) => f.properties?.focus) : [];
    (focused.length ? focused : data.features).forEach((f) => f.geometry && geometry(f.geometry));
    // Labels draw beside points, so a labelled map keeps more room at the edges.
    if (!bounds.isEmpty()) this.map.fitBounds(bounds, { padding: this.props.labels ? 72 : 40, maxZoom: 12, duration: 0 });
  }

  private teardown() {
    cancelAnimationFrame(this.#frame);
    this.#build?.abort();
    this.#observer?.disconnect();
    this.map?.remove();
    this.map = undefined;
    this.#loaded = false;
    this.#fitted = undefined;
    this.#shown = undefined;
  }

  private async build(connection: AbortSignal) {
    this.#build = new AbortController();
    const signal = AbortSignal.any([connection, this.#build.signal]);
    const status = this.querySelector<HTMLElement>("[role=status]")!;
    const colors = getComputedStyle(this);
    const token = (name: string) => colors.getPropertyValue(name).trim();
    let style: maplibregl.StyleSpecification = {
      version: 8,
      // The basemap's font server, so feature labels draw on plain ground too.
      glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
      sources: {},
      layers: [{ id: "ground", type: "background", paint: { "background-color": token("--surface-hero") } }],
    };
    let fallback = true;
    if (this.props.basemap) {
      try {
        const response = await fetch("https://tiles.openfreemap.org/styles/positron", {
          signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
        });
        if (!response.ok) throw Error("Basemap failed");
        const original = (await response.json()) as StyleDoc;
        const styled = restyleBasemap(original, {
          land: token("--surface-hero"),
          water: token("--map-water"),
          road: token("--map-road"),
          roadCasing: token("--map-road-casing"),
          countyLine: token("--map-county-line"),
          place: token("--map-place"),
          shieldText: token("--map-shield-text"),
        });
        style = (styled ?? original) as unknown as maplibregl.StyleSpecification;
        // Route-shield artwork belongs to the engine adapter; keep road labels without missing sprites.
        style.layers = style.layers.filter((layer) => !(layer.type === "symbol" && layer.layout?.["icon-image"]));
        fallback = false;
      } catch {
        /* Explicit fallback message below. */
      }
    }
    if (signal.aborted) return;
    try {
      const map = (this.map = new maplibregl.Map({
        container: this.querySelector<HTMLElement>(".ds-map-canvas")!,
        style,
        center: [-120.4, 38.1],
        zoom: 8,
        scrollZoom: false,
        attributionControl: false,
      }));
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.on("error", () => {
        status.hidden = false;
        status.textContent = "Some map resources are unavailable. Geographic context may be incomplete.";
      });
      map.on("load", () => {
        status.textContent = fallback ? "Geometry only — geographic basemap is not loaded." : "";
        status.hidden = !fallback;
        this.#shown = this.props.data;
        map.addSource("features", { type: "geojson", data: located(this.props.data) as GeoJSON.FeatureCollection });
        const chart = ["lake", "ochre", "manzanita", "glacier", "lupine", "pine"];
        const color: maplibregl.ExpressionSpecification = [
          "match",
          ["get", "tone"],
          "alarm",
          token("--signal-orange"),
          "brass",
          token("--brand-brass"),
          "muted",
          token("--ink-muted"),
          ...chart.flatMap((name) => [name, token(`--chart-${name}`)]),
          token("--brand-green"),
        ];
        const opacity: maplibregl.ExpressionSpecification = ["coalesce", ["get", "opacity"], 1];
        const z: maplibregl.ExpressionSpecification = ["coalesce", ["get", "z"], 0];
        const lines: maplibregl.FilterSpecification = ["!=", ["geometry-type"], "Point"];
        map.addLayer({ id: "ds-areas", type: "fill", source: "features", filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": color, "fill-opacity": ["*", 0.12, opacity] } });
        map.addLayer({
          id: "ds-lines", type: "line", source: "features", filter: lines,
          layout: { "line-cap": "round", "line-join": "round", "line-sort-key": z },
          paint: { "line-color": color, "line-width": ["coalesce", ["get", "weight"], 2], "line-opacity": opacity },
        });
        // Moving dashes over lines carrying traffic now (animated in #animate).
        map.addLayer({
          id: "ds-flow", type: "line", source: "features", filter: ["all", lines, ["==", ["get", "flow"], true]],
          layout: { "line-cap": "butt", "line-sort-key": z },
          paint: { "line-color": token("--surface-raised"), "line-opacity": ["*", 0.75, opacity], "line-width": ["max", 1, ["*", 0.5, ["coalesce", ["get", "weight"], 2]]], "line-dasharray": [0, 4, 3] },
        });
        // An expanding ring under live points (animated in #animate).
        map.addLayer({
          id: "ds-pulse", type: "circle", source: "features", filter: ["all", ["==", ["geometry-type"], "Point"], ["==", ["get", "pulse"], true]],
          paint: { "circle-color": color, "circle-radius": ["+", ["coalesce", ["get", "radius"], 6], 6], "circle-opacity": 0.25, "circle-stroke-width": 0 },
        });
        map.addLayer({
          id: "ds-points",
          type: "circle",
          source: "features",
          filter: ["==", ["geometry-type"], "Point"],
          layout: { "circle-sort-key": z },
          paint: { "circle-color": color, "circle-radius": ["coalesce", ["get", "radius"], 6], "circle-opacity": opacity, "circle-stroke-color": token("--surface-raised"), "circle-stroke-width": 2, "circle-stroke-opacity": opacity },
        });
        // Labels: the website's treatment — uppercase, letter-spaced, a halo in the
        // land colour, dropped where they would collide; the selection always shows.
        const name: maplibregl.ExpressionSpecification = ["upcase", ["coalesce", ["get", "shortLabel"], ["get", "label"], ""]];
        const label = (id: string, filter: maplibregl.FilterSpecification, selected: boolean): maplibregl.SymbolLayerSpecification => ({
          id,
          type: "symbol",
          source: "features",
          filter,
          layout: {
            "text-field": name,
            "text-font": ["Noto Sans Bold"],
            "text-size": selected ? 11 : 10,
            "text-letter-spacing": 0.11,
            // Right of the dot; the selected label moves left near the right edge (placeSelectedLabel).
            "text-variable-anchor": ["left", "right"],
            "text-radial-offset": selected ? 1.1 : 0.9,
            "text-padding": 2,
            "text-optional": true,
            "text-allow-overlap": selected,
            "symbol-placement": "point",
          },
          paint: { "text-color": token("--ink-strong"), "text-halo-color": token("--surface-hero"), "text-halo-width": 1.6 },
        });
        const points: maplibregl.FilterSpecification = ["==", ["geometry-type"], "Point"];
        const isSelected = (): maplibregl.FilterSpecification => ["all", points, ["==", ["id"], this.props.selected ?? -1]];
        if (this.props.labels) {
          map.addLayer(label("ds-labels", this.props.labels === "selected" ? ["==", ["id"], -1] : ["all", points, ["!=", ["id"], this.props.selected ?? -1]], false));
          map.addLayer(label("ds-label-selected", isSelected(), true));
        }
        this.#loaded = true;
        this.emphasise(this.props.selected);
        if (this.props.selectable !== false)
          for (const layer of ["ds-areas", "ds-lines", "ds-points", "ds-labels", "ds-label-selected"]) {
            if (!map.getLayer(layer)) continue;
            map.on("click", layer, (event) => {
              const id = event.features?.[0]?.id;
              if (typeof id === "number") this.select(id);
            });
            map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
            map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
          }
        this.fit(this.props.data);
        this.#animate(map, signal);
        map.on("moveend", () => this.placeSelectedLabel());
        map.on("resize", () => this.placeSelectedLabel());
      });
      this.#observer = new ResizeObserver(() => map.resize());
      this.#observer.observe(this);
    } catch {
      status.textContent = "Interactive map unavailable. Feature descriptions remain available.";
    }
  }
}

export const defineGeoMap = () => defineElement("sierra-geo-map", SierraGeoMap);

export function createGeoMap(props: GeoMapProps): SierraGeoMap {
  defineGeoMap();
  const el = document.createElement("sierra-geo-map") as SierraGeoMap;
  el.className = ["ds-geo-map", props.compact && "ds-map-compact"].filter(Boolean).join(" ");
  el.props = props;
  return el;
}
