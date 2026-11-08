import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTimeSeries,
  formatChartTime,
} from "../packages/design-system/src/lib/time-series.ts";
const make = (points, extra = {}) =>
  buildTimeSeries({
    label: "Signal",
    series: [{ id: "a", label: "A", points }],
    ...extra,
  });
test("zero, negative and null remain distinct; gaps split paths", () => {
  const result = make([
    { time: 0, value: -2 },
    { time: 1, value: 0 },
    { time: 2, value: null },
    { time: 3, value: 2 },
  ]);
  assert.deepEqual(result.valueDomain, [-2, 2]);
  assert.deepEqual(
    result.series[0].segments.map((s) => s.length),
    [2, 1],
  );
  assert.equal(result.series[0].points[1].value, 0);
});
test("unsampled intervals split only when requested and input is not mutated", () => {
  const points = [
    { time: 10, value: 3 },
    { time: 0, value: 1 },
    { time: 1, value: 2 },
  ];
  assert.deepEqual(
    make(points, { maxGapMs: 3 }).series[0].segments.map((s) => s.length),
    [2, 1],
  );
  assert.equal(make(points).series[0].segments.length, 1);
  assert.equal(points[0].time, 10);
});
test("empty, all missing, single and constant samples produce finite geometry", () => {
  assert.equal(make([]).empty, true);
  assert.equal(make([{ time: 0, value: null }]).empty, true);
  for (const points of [
    [{ time: 0, value: 0 }],
    [
      { time: 1, value: 4 },
      { time: 2, value: 4 },
    ],
  ]) {
    for (const p of make(points).series[0].segments.flat())
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  }
});
test("invalid numeric readings become gaps and invalid timestamps are omitted", () => {
  const result = make([
    { time: 0, value: 2 },
    { time: 1, value: Infinity },
    { time: 2, value: 0 },
    { time: NaN, value: 2 },
  ]);
  assert.deepEqual(
    result.series[0].segments.map((s) => s.length),
    [1, 1],
  );
  assert.equal(result.series[0].points.length, 3);
});
test("explicit domains remain stable and invalid options are rejected", () => {
  assert.deepEqual(
    make([{ time: 1, value: 2 }], { valueDomain: [-10, 10] }).valueDomain,
    [-10, 10],
  );
  assert.throws(() => make([], { valueDomain: [1, 1] }), RangeError);
  assert.throws(() => make([], { maxGapMs: 0 }), RangeError);
  assert.throws(() =>
    buildTimeSeries({
      label: "x",
      series: [
        { id: "a", label: "a", points: [] },
        { id: "a", label: "b", points: [] },
      ],
    }),
  );
});
test("UTC time labels are deterministic", () =>
  assert.equal(
    formatChartTime(Date.UTC(2026, 10, 1)),
    "2026-11-01 00:00:00 UTC",
  ));

test("single timestamp expands by one second, not a fraction of epoch time", () => {
  const time = Date.UTC(2026, 10, 1);
  assert.deepEqual(make([{ time, value: 0 }]).timeDomain, [
    time - 1000,
    time + 1000,
  ]);
  assert.throws(() => make([], { timeDomain: [0, 1e20] }), RangeError);
});
