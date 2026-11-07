/** JSON display preserves meaningful falsy values and distinguishes missing data. */
export type DataValue =
  string | number | boolean | null | DataValue[] | { [key: string]: DataValue };
export function formatDataValue(value: DataValue | undefined): string {
  if (value === undefined) return "Not provided";
  if (value === null) return "null";
  if (value === "") return '""';
  return typeof value === "string" ? value : JSON.stringify(value);
}
export interface DataChange {
  path: string;
  kind: "added" | "removed" | "changed";
  before?: DataValue;
  after?: DataValue;
}
/** JSON Pointer paths are unambiguous even when keys contain periods or slashes. Arrays compare by index. */
export function diffValues(before: DataValue, after: DataValue): DataChange[] {
  const result: DataChange[] = [];
  const walk = (a: DataValue, b: DataValue, path: string) => {
    if (a === b) return;
    if (
      a !== null &&
      b !== null &&
      typeof a === "object" &&
      typeof b === "object" &&
      Array.isArray(a) === Array.isArray(b)
    ) {
      const left = a as Record<string, DataValue>,
        right = b as Record<string, DataValue>;
      for (const key of new Set([
        ...Object.keys(left),
        ...Object.keys(right),
      ])) {
        const next = `${path}/${key.replaceAll("~", "~0").replaceAll("/", "~1")}`;
        if (!Object.hasOwn(left, key))
          result.push({ path: next, kind: "added", after: right[key] });
        else if (!Object.hasOwn(right, key))
          result.push({ path: next, kind: "removed", before: left[key] });
        else walk(left[key], right[key], next);
      }
    } else result.push({ path, kind: "changed", before: a, after: b });
  };
  walk(before, after, "");
  return result;
}
