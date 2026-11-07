/**
 * Form controls for client-rendered admin UI: buttons, the two-click confirm
 * button, and labelled fields. They emit the global classes from
 * src/styles/components.css, like the Field and Button components do.
 */
import { el, icon } from './dom';

const CONFIRM_TIMEOUT_MS = 4000;

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';

export function button(
  label: string,
  variant: ButtonVariant,
  onClick: (b: HTMLButtonElement) => void,
  opts: { icon?: string; small?: boolean } = {}
): HTMLButtonElement {
  const b = el(
    'button',
    { class: `btn btn--${variant}${opts.small === false ? '' : ' btn--sm'}`, type: 'button' },
    opts.icon && icon(opts.icon),
    label
  );
  b.addEventListener('click', () => onClick(b));
  return b;
}

/** A square ghost button with only an icon; `label` is its accessible name and tooltip. */
export function iconButton(
  iconName: string,
  label: string,
  onClick: (b: HTMLButtonElement) => void
): HTMLButtonElement {
  const b = el(
    'button',
    {
      class: 'btn btn--ghost btn--sm btn--icon',
      type: 'button',
      'aria-label': label,
      title: label,
    },
    icon(iconName)
  );
  b.addEventListener('click', () => onClick(b));
  return b;
}

/**
 * A button that needs a second click to fire: the first click turns it into
 * an orange "Confirm …" for a few seconds. Used instead of window.confirm().
 */
export function confirmButton(
  label: string,
  confirmLabel: string,
  onConfirm: (b: HTMLButtonElement) => void,
  variant: ButtonVariant = 'outline'
): HTMLButtonElement {
  const idle = `btn btn--${variant} btn--sm`;
  const b = el('button', { class: idle, type: 'button' }, label);
  let timer = 0;
  const disarm = () => {
    window.clearTimeout(timer);
    b.dataset.armed = '';
    b.textContent = label;
    b.className = idle;
  };
  b.addEventListener('click', () => {
    if (b.dataset.armed) {
      window.clearTimeout(timer);
      onConfirm(b);
      return;
    }
    b.dataset.armed = 'true';
    b.textContent = confirmLabel;
    b.className = 'btn btn--danger btn--sm';
    timer = window.setTimeout(disarm, CONFIRM_TIMEOUT_MS);
  });
  b.addEventListener('blur', disarm);
  return b;
}

let fieldCount = 0;

export interface FieldOptions {
  help?: string;
  optional?: boolean;
}

/** Label, control, help and an error line; the markup of src/components/Field.astro. */
export function field(
  label: string,
  control: HTMLElement,
  opts: FieldOptions = {}
): HTMLDivElement {
  const id = control.id || `f-${++fieldCount}`;
  control.id = id;
  const help = opts.help ? el('p', { class: 'field__help', id: `${id}-help` }, opts.help) : null;
  if (help) control.setAttribute('aria-describedby', help.id);
  return el(
    'div',
    { class: 'field' },
    el(
      'label',
      { class: 'field__label', for: id },
      label,
      opts.optional && el('span', { class: 'field__optional' }, '(optional)')
    ),
    control,
    help,
    el('p', { class: 'field__error', id: `${id}-error`, hidden: true })
  );
}

/** Show or clear the error under a control made by field(). */
export function setFieldError(control: HTMLElement, message: string | null): void {
  const error = document.getElementById(`${control.id}-error`);
  if (message) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
  if (!error) return;
  error.textContent = message ?? '';
  error.hidden = !message;
}

export function input(attrs: Record<string, string | boolean | undefined> = {}): HTMLInputElement {
  return el('input', { class: 'input', type: 'text', autocomplete: 'off', ...attrs });
}
