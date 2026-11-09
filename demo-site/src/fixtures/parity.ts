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
  select: { options: [{ value: "arnold", label: "Arnold" }, { value: "murphys", label: "Murphys" }, { value: "closed", label: "Closed", disabled: true }], value: "murphys", name: "station" },
};
