/** Markup for <sierra-select>; no DOM classes, so it renders on the server. */
import { html, nothing } from "lit-html";
import { ifDefined } from "lit-html/directives/if-defined.js";
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
}

export const firstEnabled = (options: SelectOption[]) =>
  options.find((o) => !o.disabled)?.value ?? "";

export function selectTemplate(p: SelectProps) {
  const value = p.value ?? firstEnabled(p.options);
  const selected = p.options.find((o) => o.value === value);
  return html`<button
      id=${p.id}
      type="button"
      class="select select-trigger"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded="false"
      aria-controls=${`${p.id}-options`}
      aria-describedby=${ifDefined(p.describedBy)}
      value=${value}
      ?disabled=${!!p.disabled}
    >
      <span data-select-label>${selected?.label ?? ""}</span>${icon("chevron-down", { cls: "select-chevron" })}
    </button>
    ${p.name !== undefined
      ? html`<input type="hidden" name=${p.name} .value=${value} value=${value} ?disabled=${!!p.disabled} />`
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

