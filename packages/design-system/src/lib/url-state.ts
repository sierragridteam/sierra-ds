/**
 * Typed state in the URL query string: shareable views, back/forward that work,
 * and no hand-written parse/serialise per app.
 *
 *   const schema = {
 *     metric: param.oneOf(["batteryVolts", "snr"] as const, "batteryVolts"),
 *     from: param.date(),
 *     page: param.int(1),
 *     q: param.string(""),
 *   };
 *   parseQuery(schema, location.search)  // → { metric: "batteryVolts", from: null, page: 1, q: "" }
 *   toQuery(schema, state)               // → "?metric=snr&page=2" (defaults are omitted)
 *
 * Unknown or malformed values fall back to the default, so old or hand-edited
 * links never break a page. Pure: no DOM; `urlState()` in lib/app binds it to history.
 */

export interface Param<T> {
  parse(raw: string | null): T;
  /** null removes the key (used for defaults). */
  format(value: T): string | null;
}

const isDefault = <T>(value: T, fallback: T) =>
  value === fallback ||
  (value instanceof Date && fallback instanceof Date && value.getTime() === fallback.getTime());

export const param = {
  string(fallback = ""): Param<string> {
    return {
      parse: (raw) => raw ?? fallback,
      format: (v) => (v === fallback ? null : v),
    };
  },
  int(fallback: number, { min = -Infinity, max = Infinity } = {}): Param<number> {
    return {
      parse(raw) {
        const n = raw === null || raw.trim() === "" ? NaN : Number(raw);
        return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
      },
      format: (v) => (v === fallback ? null : String(v)),
    };
  },
  bool(fallback = false): Param<boolean> {
    return {
      parse: (raw) => (raw === "1" || raw === "true" ? true : raw === "0" || raw === "false" ? false : fallback),
      format: (v) => (v === fallback ? null : v ? "1" : "0"),
    };
  },
  oneOf<const T extends readonly string[]>(values: T, fallback: T[number]): Param<T[number]> {
    return {
      parse: (raw) => ((values as readonly string[]).includes(raw ?? "") ? (raw as T[number]) : fallback),
      format: (v) => (v === fallback ? null : v),
    };
  },
  /** ISO timestamps; `null` when absent or invalid. */
  date(fallback: Date | null = null): Param<Date | null> {
    return {
      parse(raw) {
        if (!raw) return fallback;
        const t = Date.parse(raw);
        return Number.isFinite(t) ? new Date(t) : fallback;
      },
      format: (v) => (v === null || !Number.isFinite(v.getTime()) || isDefault(v, fallback) ? null : v.toISOString()),
    };
  },
  /** Comma-separated list, e.g. layers=MESH,WILDFIRE. */
  list<const T extends string = string>(fallback: T[] = [], allowed?: readonly T[]): Param<T[]> {
    return {
      parse(raw) {
        if (raw === null) return [...fallback];
        const items = raw.split(",").filter(Boolean) as T[];
        const kept = allowed ? items.filter((i) => allowed.includes(i)) : items;
        // Nothing usable (e.g. only unknown values): fall back, like other params.
        return kept.length || !raw ? kept : [...fallback];
      },
      format: (v) => (v.join(",") === fallback.join(",") ? null : v.join(",")),
    };
  },
};

export type Schema = Record<string, Param<unknown>>;
export type StateOf<S extends Schema> = { [K in keyof S]: S[K] extends Param<infer T> ? T : never };

export function parseQuery<S extends Schema>(schema: S, search: string | URLSearchParams): StateOf<S> {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return Object.fromEntries(
    Object.entries(schema).map(([key, p]) => [key, p.parse(params.get(key))]),
  ) as StateOf<S>;
}

/**
 * Query string for `state`, keeping parameters the schema does not own
 * (from `keep`, e.g. the current URL's), in a stable key order.
 */
export function toQuery<S extends Schema>(
  schema: S,
  state: Partial<StateOf<S>>,
  keep?: string | URLSearchParams,
): string {
  const params = new URLSearchParams(keep ?? "");
  for (const key of Object.keys(schema)) params.delete(key);
  for (const [key, p] of Object.entries(schema)) {
    if (!(key in state)) continue;
    const value = p.format((state as Record<string, unknown>)[key]);
    if (value !== null) params.set(key, value);
  }
  params.sort();
  const text = params.toString();
  return text ? `?${text}` : "";
}
