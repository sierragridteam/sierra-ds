/**
 * SierraElement: the contract every interactive design-system component follows.
 *
 * - `props` holds the component's whole input. Set it (or call `update()` with
 *   a partial) and the element re-renders once per microtask, however many
 *   changes arrive. Invalid props throw before anything changes.
 * - Server-rendered elements read their initial props from `data-props`.
 * - `this.signal` aborts when the element leaves the document: tie listeners,
 *   observers and fetches to it and cleanup is automatic.
 * - `define*()` registers an element from any script and `create*()` builds one,
 *   so client code never clones Astro templates or injects component scripts.
 */
import { render, type TemplateResult } from "lit-html";

export abstract class SierraElement<P extends object> extends HTMLElement {
  #props?: P;
  #controller?: AbortController;
  #scheduled = false;
  #rendered = false;
  #live = false;

  constructor() {
    super();
    // A template can set `.props` before the element is defined; that value is
    // an own property shadowing the setter. Take it over now.
    if (Object.hasOwn(this, "props")) {
      const early = (this as unknown as { props: P }).props;
      delete (this as unknown as { props?: P }).props;
      this.props = early;
    }
  }

  /** Validate props; throw to reject an update. */
  protected validate(_props: P): void {}
  /** The element's markup for these props. Return undefined to manage the DOM yourself. */
  protected abstract template(props: P): TemplateResult | undefined;
  /** Runs after each render, e.g. to sync a canvas or map. */
  protected updated(_props: P): void {}
  /** Runs once per connection, after the first render. */
  protected connected(_signal: AbortSignal): void {}
  /** Runs when the element leaves the document, after `signal` aborts. */
  protected disconnected(): void {}

  get props(): P {
    return this.#props!;
  }
  set props(next: P) {
    this.validate(next);
    this.#props = next;
    // Appended before it had props: start now.
    if (this.isConnected && !this.#live) this.#start();
    else this.requestUpdate();
  }
  /** Merge a partial change into props. */
  update(partial: Partial<P>): void {
    this.props = { ...this.#props!, ...partial };
  }

  /** Aborts when the element leaves the document. */
  protected get signal(): AbortSignal {
    return this.#controller!.signal;
  }

  connectedCallback() {
    // Moved within one task (a keyed list reorder): keep the live instance.
    if (this.#live) return;
    if (!this.#props) {
      const raw = this.dataset.props;
      if (!raw) return; // Props will arrive through the setter.
      this.#props = JSON.parse(raw) as P;
      this.validate(this.#props);
    }
    this.#start();
  }

  disconnectedCallback() {
    // Tear down only if still detached after this task, so moves keep state.
    queueMicrotask(() => {
      if (this.isConnected || !this.#live) return;
      this.#live = false;
      this.#controller?.abort();
      this.#controller = undefined;
      this.disconnected();
    });
  }

  #start() {
    this.#live = true;
    this.#controller = new AbortController();
    this.renderNow();
    this.connected(this.signal);
  }

  /** Batch renders: many prop changes in one task render once. */
  protected requestUpdate() {
    if (this.#scheduled || !this.#live) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.#live) this.renderNow();
    });
  }

  /** Render synchronously (used on connect and by tests). */
  renderNow() {
    const template = this.template(this.#props!);
    if (template !== undefined) {
      // Server markup is replaced once by an identical client render that lit then owns.
      if (!this.#rendered) this.replaceChildren();
      render(template, this);
    }
    this.#rendered = true;
    this.updated(this.#props!);
  }
}

/** Register a custom element once, whichever script gets there first. */
export function defineElement(tag: string, ctor: CustomElementConstructor) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
}

/** Serialise props for a server-rendered element's `data-props`. */
export const serializeProps = (props: object) => JSON.stringify(props);
