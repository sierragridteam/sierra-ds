/**
 * <sierra-load-more>: infinite scroll with a real button behind it.
 *
 *   <div class="feed">…rows…</div>
 *   <sierra-load-more .props=${{ hasMore: !!token, loading, error }} @load-more=${next}></sierra-load-more>
 *
 * Put it after the list. When it comes near view (inside the nearest scrolling
 * ancestor, or the page) it fires `load-more`; load the next page, set
 * `loading` while you do, then set `hasMore`/`error`. It fires again if the new
 * page still leaves it in view, so a short page fills the space. An `error`
 * stops automatic loading and turns the button into "Try again". The button is
 * always there: keyboard and screen-reader users, and anyone with `auto: false`,
 * load the same way.
 */
import { html, nothing } from "lit-html";
import { defineElement, SierraElement } from "./element";

export interface LoadMoreProps {
  /** Another page exists. */
  hasMore: boolean;
  /** A page is loading; no new request fires until this is false again. */
  loading: boolean;
  /** Why the last page failed. Stops automatic loading until cleared. */
  error?: string;
  /** Button text, e.g. "Load more reports". */
  label?: string;
  /** Shown when there is nothing more, e.g. "All matching reports loaded." */
  endLabel?: string;
  /** Load automatically near the end (default true). */
  auto?: boolean;
  /** How early to load, as an IntersectionObserver root margin (default "600px 0px"). */
  rootMargin?: string;
}

/** The nearest ancestor that scrolls vertically, or null for the page. */
function scrollParent(el: Element): Element | null {
  for (let node = el.parentElement; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

export class SierraLoadMore extends SierraElement<LoadMoreProps> {
  #observer?: IntersectionObserver;
  #root: Element | null | undefined;
  #visible = false;
  /** A load-more was fired and the page has not reported `loading` back yet. */
  #pending = false;

  protected template(p: LoadMoreProps) {
    const fire = () => this.#fire(true);
    return html`<span class="ds-load-more__sentinel" aria-hidden="true"></span>
      ${p.hasMore
        ? html`<button type="button" class="btn btn--outline btn--sm" ?disabled=${p.loading} aria-busy=${p.loading ? "true" : "false"} @click=${fire}>${p.loading ? "Loading…" : p.error ? "Try again" : (p.label ?? "Load more")}</button>`
        : p.endLabel
          ? html`<p class="ds-load-more__end">${p.endLabel}</p>`
          : nothing}
      ${p.error ? html`<p class="ds-load-more__error" role="status">${p.error}</p>` : nothing}`;
  }

  protected connected(signal: AbortSignal) {
    this.classList.add("ds-load-more");
    this.#observe();
    // The scroll container can change with layout (a sticky column on desktop, the page on a phone).
    addEventListener("resize", () => this.#observe(), { signal, passive: true });
  }

  protected updated(p: LoadMoreProps) {
    if (!p.loading) this.#pending = false;
    // A page that loaded but did not push the sentinel out of reach: keep going.
    // Measure now; the observer's last reading predates the new rows.
    requestAnimationFrame(() => {
      if (!this.isConnected) return;
      if (this.#root === undefined || scrollParent(this) !== this.#root) this.#observe();
      this.#visible = this.#inReach();
      this.#maybeLoad();
    });
  }

  /** Whether the sentinel is within rootMargin of its scroll container (or the viewport) right now. */
  #inReach(): boolean {
    const sentinel = this.querySelector(".ds-load-more__sentinel");
    if (!sentinel) return false;
    const margin = parseFloat(this.props.rootMargin ?? "600px") || 0;
    const box = sentinel.getBoundingClientRect();
    const area = this.#root ? this.#root.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    return box.top <= area.bottom + margin && box.bottom >= area.top - margin;
  }

  protected disconnected() {
    this.#observer?.disconnect();
    this.#observer = undefined;
  }

  #observe() {
    if (!this.isConnected) return;
    const root = scrollParent(this);
    if (this.#observer && root === this.#root) return;
    this.#observer?.disconnect();
    this.#root = root;
    this.#observer = new IntersectionObserver(
      (entries) => {
        this.#visible = entries.some((e) => e.isIntersecting);
        this.#maybeLoad();
      },
      { root, rootMargin: this.props.rootMargin ?? "600px 0px" },
    );
    const sentinel = this.querySelector(".ds-load-more__sentinel");
    if (sentinel) this.#observer.observe(sentinel);
  }

  #maybeLoad() {
    const p = this.props;
    if (p.auto === false || !this.#visible || p.error) return;
    this.#fire(false);
  }

  #fire(manual: boolean) {
    const p = this.props;
    if (!p.hasMore || p.loading || this.#pending) return;
    this.#pending = true;
    this.dispatchEvent(new CustomEvent("load-more", { bubbles: true, detail: { manual } }));
  }
}

export const defineLoadMore = () => defineElement("sierra-load-more", SierraLoadMore);

export function createLoadMore(props: LoadMoreProps, { id }: { id?: string } = {}): SierraLoadMore {
  defineLoadMore();
  const el = document.createElement("sierra-load-more") as SierraLoadMore;
  if (id) el.id = id;
  el.props = props;
  return el;
}
