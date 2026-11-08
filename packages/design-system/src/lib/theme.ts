/**
 * Colour theme preference. The preference lives in `data-theme` on <html>:
 * "light", "dark" or "system" (follow the operating system). Without the
 * attribute the stylesheet renders light, so existing consumers are unchanged.
 *
 * ThemeScript applies a stored preference before first paint; ThemeSwitcher
 * lets people change it. Use onThemeChange to react to the resolved theme
 * (for example to restyle canvas or WebGL output that cannot read CSS).
 */

export type ThemePreference = "light" | "dark" | "system";
export type Theme = "light" | "dark";
export interface ThemeState {
  preference: ThemePreference;
  theme: Theme;
}

/** localStorage key shared with ThemeScript's inline copy of this logic. */
export const THEME_STORAGE_KEY = "sierra-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** Pure: the theme a preference produces given the system setting. */
export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): Theme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

function systemPrefersDark(): boolean {
  return globalThis.matchMedia?.(DARK_QUERY).matches ?? false;
}

/** The applied preference; a missing or unknown attribute means light. */
export function getThemePreference(): ThemePreference {
  const value = document.documentElement.dataset.theme;
  return isThemePreference(value) ? value : "light";
}

export function getThemeState(): ThemeState {
  const preference = getThemePreference();
  return { preference, theme: resolveTheme(preference, systemPrefersDark()) };
}

/** The persisted preference, or null when none is stored or storage is blocked. */
export function readStoredThemePreference(
  storageKey = THEME_STORAGE_KEY,
): ThemePreference | null {
  try {
    const value = localStorage.getItem(storageKey);
    return isThemePreference(value) ? value : null;
  } catch {
    return null;
  }
}

/** Apply a preference to <html> and, by default, remember it on this origin. */
export function setThemePreference(
  preference: ThemePreference,
  { persist = true, storageKey = THEME_STORAGE_KEY } = {},
): void {
  if (!isThemePreference(preference))
    throw new TypeError(`Unknown theme preference: ${String(preference)}`);
  document.documentElement.dataset.theme = preference;
  if (!persist) return;
  try {
    localStorage.setItem(storageKey, preference);
  } catch {
    /* Private or blocked storage: the choice still applies to this page. */
  }
}

/**
 * Call `callback` whenever the preference or resolved theme changes, whether
 * from a switcher, another script, another tab, or the operating system.
 * Stop listening by aborting `signal`.
 */
export function onThemeChange(
  callback: (state: ThemeState) => void,
  { signal }: { signal?: AbortSignal } = {},
): void {
  let last = getThemeState();
  const check = () => {
    const next = getThemeState();
    if (next.preference === last.preference && next.theme === last.theme)
      return;
    last = next;
    callback(next);
  };
  const observer = new MutationObserver(check);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  globalThis.matchMedia?.(DARK_QUERY).addEventListener("change", check, {
    signal,
  });
  signal?.addEventListener("abort", () => observer.disconnect(), {
    once: true,
  });
}

/** Keep this page in step with preferences chosen in other tabs. */
export function syncThemeAcrossTabs({
  signal,
  storageKey = THEME_STORAGE_KEY,
}: { signal?: AbortSignal; storageKey?: string } = {}): void {
  addEventListener(
    "storage",
    (event) => {
      if (event.key === storageKey && isThemePreference(event.newValue))
        setThemePreference(event.newValue, { persist: false });
    },
    { signal },
  );
}
