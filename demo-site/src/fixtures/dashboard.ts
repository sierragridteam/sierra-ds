/** Synthetic fixtures for the dashboard pattern page. Not real events. */
import type { FeatureCollection, Geometry } from "geojson";
import type { DataValue } from "@sierragridteam/design-system/lib/data-values";

export type Category = "roads" | "wildfires" | "weather";
export interface Report {
  id: string;
  /** Short name for map labels. */
  short: string;
  category: Category;
  severity: { tone: "alarm" | "elevated" | "ok" | "muted"; label: string };
  status: string;
  title: string;
  place: string;
  when?: string;
  source: string;
  received: string;
  coordinates: [number, number];
  /** Two revisions, to show what changed. */
  previous: DataValue;
  current: DataValue;
}

export const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "roads", label: "Roads" },
  { value: "wildfires", label: "Wildfires" },
  { value: "weather", label: "Weather" },
] as const;

export const REPORTS: Report[] = [
  {
    id: "fire-summit",
    short: "Summit Fire",
    category: "wildfires",
    severity: { tone: "alarm", label: "Severe" },
    status: "Active",
    title: "Summit Fire — 6 acres",
    place: "North of Dorrington, Calaveras County",
    source: "Synthetic fire agency feed",
    received: "3h ago",
    coordinates: [-120.27, 38.33],
    previous: { acres: 2, containment: "0%", evacuations: "none" },
    current: { acres: 6, containment: "10%", evacuations: "warning" },
  },
  {
    id: "hwy4-closure",
    short: "Hwy 4 closure",
    category: "roads",
    severity: { tone: "alarm", label: "Severe" },
    status: "Active",
    title: "Hwy 4 closed, Arnold to Bear Valley",
    place: "Hwy 4 between Arnold and Bear Valley",
    when: "Mon 9 Nov, 06:00 – until further notice",
    source: "Synthetic roads feed",
    received: "5h ago",
    coordinates: [-120.17, 38.4],
    previous: { lanes: "one-way control", reason: "snow" },
    current: { lanes: "closed", reason: "snow and ice", chains: true },
  },
  {
    id: "hwy49-drainage",
    short: "Hwy 49 work",
    category: "roads",
    severity: { tone: "elevated", label: "Moderate" },
    status: "Active",
    title: "Hwy 49 lane closure for drainage work",
    place: "Hwy 49, Solinski Street to Washington Street, near Sonora",
    when: "Mon 9 Nov, 07:00–16:00",
    source: "Synthetic roads feed",
    received: "2d ago",
    coordinates: [-120.38, 37.98],
    previous: { lanes: "open" },
    current: { lanes: "one closed", flagging: true },
  },
  {
    id: "wind-advisory",
    short: "Wind advisory",
    category: "weather",
    severity: { tone: "elevated", label: "Moderate" },
    status: "Scheduled",
    title: "Wind advisory above 6,000 ft",
    place: "Ebbetts Pass and Bear Valley",
    when: "Tue 10 Nov, 10:00 – Wed 11 Nov, 04:00",
    source: "Synthetic weather feed",
    received: "1d ago",
    coordinates: [-119.98, 38.48],
    previous: { gusts: "45 mph" },
    current: { gusts: "55 mph", until: "Wed 04:00" },
  },
  {
    id: "hwy4-control",
    short: "Hwy 4 control",
    category: "roads",
    severity: { tone: "muted", label: "Minor" },
    status: "Scheduled",
    title: "Hwy 4 one-way traffic control",
    place: "Hwy 4 at Horseshoe Drive, near Hathaway Pines",
    when: "Thu 12 Nov, 07:00–16:00",
    source: "Synthetic roads feed",
    received: "2d ago",
    coordinates: [-120.36, 38.19],
    previous: {},
    current: { lanes: "one-way control" },
  },
];

/** Display name for a category: "roads" → "Roads". */
export const label = (category: Category) => CATEGORIES.find((c) => c.value === category)!.label;

export const toFeatures = (reports: Report[]): FeatureCollection<Geometry | null> => ({
  type: "FeatureCollection",
  features: reports.map((r) => ({
    type: "Feature",
    properties: { label: r.title, shortLabel: r.short, description: r.place, tone: r.severity.tone === "alarm" ? "alarm" : r.severity.tone === "elevated" ? "brass" : undefined },
    geometry: { type: "Point", coordinates: r.coordinates },
  })),
});

export const STATIONS = [
  { value: "arnold", label: "Arnold", now: 50, low: 38, high: 64, icon: "sun", condition: "Clear sky" },
  { value: "murphys", label: "Murphys", now: 54, low: 41, high: 68, icon: "cloud-sun", condition: "Partly cloudy" },
  { value: "bear-valley", label: "Bear Valley", now: 36, low: 24, high: 47, icon: "cloud-snow", condition: "Light snow" },
  { value: "sonora", label: "Sonora", now: 56, low: 43, high: 70, icon: "sun", condition: "Clear sky" },
  { value: "dorrington", label: "Dorrington", now: 44, low: 32, high: 56, icon: "cloud", condition: "Overcast" },
  { value: "twain-harte", label: "Twain Harte", now: 48, low: 36, high: 61, icon: "cloud-rain", condition: "Showers" },
];

const HOUR = 3_600_000;
export const FORECAST_START = Date.UTC(2026, 10, 9, 20); // 12:00 PT

/** Next 24 hours, °F, from a station's low and high. */
export function forecast(station: (typeof STATIONS)[number]) {
  return Array.from({ length: 25 }, (_, i) => {
    const local = (12 + i) % 24;
    const day = local > 6.75 && local < 16.9 ? Math.sin(((local - 6.75) / 10.15) * Math.PI) : 0;
    return { time: FORECAST_START + i * HOUR, value: Math.round(station.low + (station.high - station.low) * day) };
  });
}

export const toCelsius = (f: number) => Math.round(((f - 32) * 5) / 9);
