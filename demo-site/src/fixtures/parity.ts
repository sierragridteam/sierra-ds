/** Props rendered both by Astro components and by client templates in tests. */
export const PARITY = {
  feed: {
    title: "Hwy 4 <closed> & icy",
    href: "?report=a&b=1",
    severity: { tone: "alarm" as const, label: "Severe" },
    tags: ["Roads", "Active"],
    place: "Arnold to Bear Valley",
    when: "Mon 9 Nov, 06:00",
    source: "Synthetic feed",
    received: "3h ago",
  },
  segmented: { label: "Unit", name: "parity-unit", options: [{ value: "f", label: "°F" }, { value: "c", label: "°C" }], value: "c" },
  tiles: { label: "Station", name: "parity-station", size: "compact" as const, value: "b", options: [{ value: "a", label: "Arnold", detail: "50°F" }, { value: "b", label: "Murphys", detail: "54°F" }] },
  diff: { label: "Revision", changes: [{ path: "/acres", kind: "changed" as const, before: 2, after: 6 }, { path: "/chains", kind: "added" as const, after: true }] },
  metrics: { label: "Node details", size: "compact" as const, items: [{ label: "Battery", value: 4.07, unit: "V" }, { label: "Noise", value: null, missing: "Not reported" }, { label: "Gateways", identifiers: ["0b0b037985e4980662d3e7862d35aebb", "0f0f038de5fd9631e7c6e6de50844a69", "131248"] }] },
  sign: { location: "EB 4 W/O MURPHYS", route: "SR-4", direction: "East", pages: [["EBBETTS PASS", "CLOSED", ""], ["USE", "HWY 88", ""]], inService: true, detail: "Showing since Wed 4 Nov, 06:20 PT" },
  header: { title: "Power outage <1> & crew", badges: [{ label: "Info" }, { label: "Active", dot: false }], tags: ["Power"], subtitle: "Arnold", meta: "PG&E · Reported Mon 9 Nov, 09:59 PT" },
  select: { options: [{ value: "arnold", label: "Arnold" }, { value: "murphys", label: "Murphys" }, { value: "closed", label: "Closed", disabled: true }], value: "murphys", name: "station" },
};
