/**
 * App navigation primitives for Astro sites that use the ClientRouter
 * (persistent shell, pages swapped without reloads). They cover what each app
 * otherwise rediscovers:
 *
 * - A page module runs once per visit, not once per view. `definePage` mounts
 *   on the first load and on every later navigation that lands on the page, and
 *   aborts `signal` when the page is left, so listeners, timers, fetches,
 *   regions and design-system elements are cleaned up.
 * - `urlState` keeps a typed store in the query string: links are shareable and
 *   back/forward restore the view.
 * - `installNavigation` shows the progress sweep while the next page loads and
 *   keeps persisted navigation links' current-page state correct.
 * - The ClientRouter replaces <html> attributes on every swap; ThemeScript
 *   already carries `data-theme` across. Use `keepRootAttributes` for others.
 *
 * Works without the ClientRouter too: pages then mount once per load.
 */
import { navigate as astroNavigate } from "astro:transitions/client";
import { createStore, type Store } from "./region";
import { parseQuery, toQuery, type Schema, type StateOf } from "./url-state";

export interface PageContext {
  /** The swapped content root: `#main` when present, otherwise <body>. */
  root: HTMLElement;
  url: URL;
  /** Named groups from a RegExp match, e.g. /^\/events\/(?<id>[^/]+)$/. */
  params: Record<string, string>;
  /** Aborts when the user navigates away from this page view. */
  signal: AbortSignal;
}

type Match = string | RegExp | ((url: URL) => boolean);

const normalise = (path: string) => path.replace(/\/$/, "") || "/";

function matches(match: Match, url: URL): Record<string, string> | null {
  const path = normalise(url.pathname);
  if (typeof match === "string") return normalise(match) === path ? {} : null;
  if (match instanceof RegExp) {
    const m = match.exec(path);
    return m ? { ...(m.groups ?? {}) } : null;
  }
  return match(url) ? {} : null;
}

/**
 * Mount client code for a page. `mount` runs once per page view, after the
 * page's HTML is in place; return nothing or a promise. Errors are reported to
 * the console and do not break navigation.
 */
export function definePage(
  match: Match,
  mount: (ctx: PageContext) => void | Promise<void>,
  { rootSelector = "#main" }: { rootSelector?: string } = {},
): void {
  let mounted: HTMLElement | null = null;
  let controller: AbortController | undefined;
  const run = () => {
    const url = new URL(location.href);
    const params = matches(match, url);
    // Layouts that swap a #main column scope pages to it; anything else gets <body>.
    const root = document.querySelector<HTMLElement>(rootSelector) ?? document.body;
    if (!params || !root || root === mounted) return;
    controller?.abort();
    controller = new AbortController();
    mounted = root;
    Promise.resolve()
      .then(() => mount({ root, url, params, signal: controller!.signal }))
      .catch((error) => console.error(`Page ${String(match)} failed to mount`, error));
  };
  const leave = () => {
    controller?.abort();
    controller = undefined;
    mounted = null;
  };
  document.addEventListener("astro:before-swap", leave);
  document.addEventListener("astro:page-load", run);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}

/** Navigate within the app (client-side when the ClientRouter is on). */
export function navigate(href: string, { replace = false }: { replace?: boolean } = {}) {
  return astroNavigate(href, { history: replace ? "replace" : "auto" });
}

let installed = false;
/**
 * Once per app (in the layout): progress sweep during navigation
 * (`html[data-navigating]`, styled by shell.css) and current-page state on
 * links marked `data-nav`. A link is current when its path equals the page's,
 * or is a prefix of it with `data-nav="section"`.
 */
export function installNavigation(): void {
  if (installed) return;
  installed = true;
  const html = document.documentElement;
  document.addEventListener("astro:before-preparation", () => (html.dataset.navigating = ""));
  const done = () => delete html.dataset.navigating;
  document.addEventListener("astro:after-preparation", done);
  document.addEventListener("astro:page-load", () => {
    done();
    syncNavLinks();
  });
  syncNavLinks();
}

export function syncNavLinks(root: ParentNode = document): void {
  const here = normalise(location.pathname);
  root.querySelectorAll<HTMLAnchorElement>("a[data-nav]").forEach((link) => {
    const path = normalise(new URL(link.href, location.href).pathname);
    const current =
      path === here || (link.dataset.nav === "section" && path !== "/" && here.startsWith(`${path}/`));
    link.classList.toggle("is-active", current);
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

/**
 * Carry attributes of <html> across ClientRouter swaps (the router replaces
 * them with the incoming page's). `data-theme` is already handled by ThemeScript.
 */
export function keepRootAttributes(names: string[]): void {
  document.addEventListener("astro:before-swap", (event) => {
    const next = (event as Event & { newDocument: Document }).newDocument.documentElement;
    for (const name of names) {
      const value = document.documentElement.getAttribute(name);
      if (value !== null) next.setAttribute(name, value);
    }
  });
}

export interface UrlState<S extends Schema> extends Store<StateOf<S>> {
  /** A link to this page with `patch` applied; use for <a href> so views are shareable. */
  href(patch?: Partial<StateOf<S>>): string;
}

/**
 * A store whose state lives in the query string. `set` updates the URL with
 * `history.replaceState` (or `pushState` with `{ push: true }` in the options)
 * without a navigation; back/forward re-parse it. Parameters the schema does
 * not own are kept. Pass the page's `signal` so it stops listening on leave.
 */
export function urlState<S extends Schema>(
  schema: S,
  { signal, push = false }: { signal?: AbortSignal; push?: boolean } = {},
): UrlState<S> {
  const store = createStore(parseQuery(schema, location.search));
  const write = (state: StateOf<S>) => {
    const query = toQuery(schema, state, location.search);
    const next = `${location.pathname}${query}${location.hash}`;
    if (next === `${location.pathname}${location.search}${location.hash}`) return;
    // Keep Astro's history entry state so the ClientRouter still restores scroll.
    if (push) history.pushState(history.state, "", next);
    else history.replaceState(history.state, "", next);
  };
  let fromHistory = false;
  store.subscribe((state) => {
    if (!fromHistory) write(state);
    fromHistory = false;
  }, { signal });
  addEventListener(
    "popstate",
    () => {
      fromHistory = true;
      store.set(parseQuery(schema, location.search));
    },
    { signal },
  );
  return {
    ...store,
    href(patch = {}) {
      return `${location.pathname}${toQuery(schema, { ...store.get(), ...patch }, location.search)}`;
    },
  };
}
