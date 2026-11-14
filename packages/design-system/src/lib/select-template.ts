/** Markup for <sierra-select>; no DOM classes, so it renders on the server. */
import { html, nothing } from "lit-html";
import { classMap } from "lit-html/directives/class-map.js";
import { ifDefined } from "lit-html/directives/if-defined.js";
import { isServer } from "lit-html/is-server.js";
import { icon } from "./ui";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
export interface SelectProps {
  /** Id of the trigger button; pair with a <label for>. Unique per page. */
  id: string;
  options: SelectOption[];
  value?: string;
  /** Submits the value through a hidden input. */
  name?: string;
  disabled?: boolean;
  describedBy?: string;
  /**
   * "filter": a compact button sized to its choice, for a `.filter-bar` above
   * a list. There is no label above it: `label` names it for assistive tech,
   * and `prefix` shows the name inline when the choice alone would not
   * explain itself ("Type: Mesh").
   */
  variant?: "field" | "filter";
  /** Filter: the filter's name; the trigger is announced as "Type: Mesh". */
  label?: string;
  /** Filter: muted text before the choice, usually the label ("Type"). */
  prefix?: string;
  /** Filter: the choice narrows the list (it is not the default), shown as applied. */
  applied?: boolean;
}

export const firstEnabled = (options: SelectOption[]) =>
  options.find((o) => !o.disabled)?.value ?? "";

export function selectTemplate(p: SelectProps) {
  const value = p.value ?? firstEnabled(p.options);
  const selected = p.options.find((o) => o.value === value);
  return html`<button
      id=${p.id}
      type="button"
      class=${classMap({ select: true, "select-trigger": true, "select-trigger--filter": p.variant === "filter", "is-applied": p.variant === "filter" && !!p.applied })}
      role="combobox"
      aria-label=${ifDefined(p.label ? `${p.label}: ${selected?.label ?? ""}` : undefined)}
      aria-haspopup="listbox"
      aria-expanded="false"
      aria-controls=${`${p.id}-options`}
      aria-describedby=${ifDefined(p.describedBy)}
      value=${value}
      ?disabled=${!!p.disabled}
    >
      ${p.variant === "filter" && p.prefix ? html`<span class="select-trigger__prefix">${p.prefix}:</span>` : nothing}<span data-select-label>${selected?.label ?? ""}</span>${icon("chevron-down", { cls: "select-chevron" })}
    </button>
    ${p.name !== undefined
      ? html`<input type="hidden" name=${p.name} .value=${isServer ? nothing : value} value=${value} ?disabled=${!!p.disabled} />`
      : nothing}
    <div id=${`${p.id}-options`} class="select-popover" popover="auto" role="listbox" aria-labelledby=${p.id}>
      ${p.options.map(
        (o, i) => html`<div
          id=${`${p.id}-option-${i}`}
          class="select-option"
          role="option"
          aria-selected=${String(o.value === value)}
          aria-disabled=${ifDefined(o.disabled ? "true" : undefined)}
          data-value=${o.value}
        >
          <span>${o.label}</span>${icon("check", { cls: "select-check" })}
        </div>`,
      )}
    </div>`;
}

