/**
 * <sierra-select>: single-choice popover listbox. Arrow keys, Home/End,
 * typeahead, Enter/Space, Escape and outside clicks behave like a native select.
 *
 *   const select = createSelect({ id: "station", options, value: "arnold" });
 *   select.addEventListener("change", () => load(select.value));
 *   select.options = await fetchStations();   // after data loads
 *   select.value = "murphys";                 // programmatic, no event
 */
import { defineElement, SierraElement } from "./element";
import { firstEnabled, selectTemplate, type SelectOption, type SelectProps } from "./select-template";

export { selectTemplate, type SelectOption, type SelectProps };

export class SierraSelect extends SierraElement<SelectProps> {
  #active = -1;
  #search = "";
  #searchedAt = 0;

  protected validate(p: SelectProps) {
    if (!p.id) throw new Error("Select needs an id");
    const values = new Set<string>();
    for (const o of p.options) {
      if (values.has(o.value)) throw new Error(`Duplicate select value: ${o.value}`);
      values.add(o.value);
    }
  }
  protected template(p: SelectProps) {
    return selectTemplate(p);
  }

  get value(): string {
    return this.props.value ?? firstEnabled(this.props.options);
  }
  /** Programmatic change: updates the display without firing `change`. */
  set value(value: string) {
    this.update({ value });
  }
  get options(): SelectOption[] {
    return this.props.options;
  }
  /** Replace the options; keeps the value when it still exists. */
  set options(options: SelectOption[]) {
    const keep = options.some((o) => o.value === this.props.value && !o.disabled);
    this.update({ options, value: keep ? this.props.value : firstEnabled(options) });
  }

  private get trigger() {
    return this.querySelector<HTMLButtonElement>("button")!;
  }
  private get panel() {
    return this.querySelector<HTMLElement>("[popover]")!;
  }
  private get enabled() {
    return [...this.panel.querySelectorAll<HTMLElement>("[role=option]")].filter(
      (o) => o.getAttribute("aria-disabled") !== "true",
    );
  }
  private isOpen() {
    return this.panel.matches(":popover-open");
  }
  private highlight(index: number) {
    const enabled = this.enabled;
    this.#active = Math.max(0, Math.min(index, enabled.length - 1));
    this.panel
      .querySelectorAll<HTMLElement>("[role=option]")
      .forEach((o) => o.classList.toggle("is-active", o === enabled[this.#active]));
    const active = enabled[this.#active];
    if (active) {
      this.trigger.setAttribute("aria-activedescendant", active.id);
      active.scrollIntoView({ block: "nearest" });
    }
  }
  private position() {
    const { trigger, panel } = this;
    const box = trigger.getBoundingClientRect();
    panel.style.width = `${Math.min(box.width, innerWidth - 16)}px`;
    panel.style.left = `${Math.max(8, Math.min(box.left, innerWidth - panel.offsetWidth - 8))}px`;
    const below = innerHeight - box.bottom - 8;
    const above = box.top - 8;
    const up = below < Math.min(panel.scrollHeight, 240) && above > below;
    panel.style.maxHeight = `${Math.max(0, Math.min(240, up ? above : below))}px`;
    panel.style.top = `${up ? box.top - panel.offsetHeight - 4 : box.bottom + 4}px`;
  }
  private open() {
    this.panel.showPopover();
    this.position();
    this.trigger.setAttribute("aria-expanded", "true");
    this.highlight(this.enabled.findIndex((o) => o.dataset.value === this.value));
  }
  private close() {
    if (this.isOpen()) this.panel.hidePopover();
  }
  private choose(option: HTMLElement) {
    if (!this.enabled.includes(option)) return;
    this.value = option.dataset.value!;
    this.renderNow();
    this.close();
    this.trigger.focus();
    this.trigger.dispatchEvent(new Event("input", { bubbles: true }));
    this.trigger.dispatchEvent(new Event("change", { bubbles: true }));
  }

  protected connected(signal: AbortSignal) {
    // Delegated listeners survive re-renders of the trigger and options.
    this.addEventListener(
      "click",
      (event) => {
        const target = event.target as Element;
        const option = target.closest<HTMLElement>("[role=option]");
        if (option) this.choose(option);
        else if (target.closest("button") === this.trigger)
          this.isOpen() ? this.close() : this.open();
      },
      { signal },
    );
    this.addEventListener(
      "toggle",
      () => {
        this.trigger.setAttribute("aria-expanded", String(this.isOpen()));
        if (!this.isOpen()) this.trigger.removeAttribute("aria-activedescendant");
      },
      { signal, capture: true },
    );
    this.addEventListener("keydown", (event) => this.keydown(event), { signal });
    window.addEventListener("resize", () => this.close(), { signal });
    document.addEventListener(
      "scroll",
      (event) => {
        if (!this.panel.contains(event.target as Node)) this.close();
      },
      { capture: true, signal },
    );
  }

  private keydown(event: KeyboardEvent) {
    if (event.target !== this.trigger) return;
    const enabled = this.enabled;
    if (event.key === "Tab" || event.key === "Escape") {
      this.close();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const wasOpen = this.isOpen();
      if (!wasOpen) this.open();
      this.highlight(
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? enabled.length - 1
            : this.#active + (wasOpen ? (event.key === "ArrowDown" ? 1 : -1) : 0),
      );
    } else if ((event.key === "Enter" || event.key === " ") && this.isOpen()) {
      event.preventDefault();
      if (enabled[this.#active]) this.choose(enabled[this.#active]);
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      event.key !== " "
    ) {
      event.preventDefault();
      if (!this.isOpen()) this.open();
      this.#search = Date.now() - this.#searchedAt > 600 ? event.key : this.#search + event.key;
      this.#searchedAt = Date.now();
      const index = enabled.findIndex((o) =>
        o.textContent?.trim().toLowerCase().startsWith(this.#search.toLowerCase()),
      );
      if (index >= 0) this.highlight(index);
    }
  }
}

export const defineSelect = () => defineElement("sierra-select", SierraSelect);

export function createSelect(props: SelectProps): SierraSelect {
  defineSelect();
  const el = document.createElement("sierra-select") as SierraSelect;
  el.props = props;
  return el;
}
