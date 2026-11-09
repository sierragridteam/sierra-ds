/**
 * Regions: re-render part of a page from state, React-style, without a framework.
 *
 *   const store = createStore({ filter: "all", selected: null, events: [] });
 *   region(document.querySelector("#feed")!, store, (s) => html`
 *     <div class="feed">${repeat(visible(s), (e) => e.id, (e) => feedItem(e))}</div>
 *     <sierra-line-chart .props=${chartProps(s)}></sierra-line-chart>`);
 *   store.set({ events: await load() });
 *
 * Only what changed is touched: keyed rows are reused, design-system elements
 * receive new props instead of being rebuilt (so focus, open tables, map
 * position and chart state survive), and many `set` calls in one task render once.
 */
import { render, type TemplateResult } from "lit-html";

export interface Store<S extends object> {
  get(): S;
  /** Merge a partial state, or derive one from the current state. */
  set(next: Partial<S> | ((state: S) => Partial<S>)): void;
  subscribe(listener: (state: S) => void, options?: { signal?: AbortSignal }): () => void;
}

export function createStore<S extends object>(initial: S): Store<S> {
  let state = initial;
  const listeners = new Set<(state: S) => void>();
  let scheduled = false;
  const flush = () => {
    scheduled = false;
    for (const listener of [...listeners]) listener(state);
  };
  return {
    get: () => state,
    set(next) {
      const patch = typeof next === "function" ? next(state) : next;
      state = { ...state, ...patch };
      if (!scheduled) {
        scheduled = true;
        queueMicrotask(flush);
      }
    },
    subscribe(listener, { signal } = {}) {
      listeners.add(listener);
      const remove = () => listeners.delete(listener);
      signal?.addEventListener("abort", remove, { once: true });
      return remove;
    },
  };
}

export interface Region {
  /** Render now, outside the store's batching (rarely needed). */
  refresh(): void;
  /** Stop listening; the DOM stays as last rendered. */
  dispose(): void;
}

/**
 * Bind `container`'s contents to `view(store state)`. The first render replaces
 * whatever the server put there (skeletons, empty states).
 */
export function region<S extends object>(
  container: HTMLElement,
  store: Store<S>,
  view: (state: S) => TemplateResult,
  { signal }: { signal?: AbortSignal } = {},
): Region {
  container.replaceChildren();
  const paint = () => render(view(store.get()), container);
  paint();
  const unsubscribe = store.subscribe(paint, { signal });
  return { refresh: paint, dispose: unsubscribe };
}

/** One-off render of a template into a container (no store). */
export function renderInto(container: HTMLElement, template: TemplateResult) {
  render(template, container);
}
