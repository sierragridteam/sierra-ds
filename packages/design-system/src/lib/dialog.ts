/**
 * Modal dialogs on the native <dialog> element: focus trapping, Escape and the
 * top layer come from the browser. Used by the admin editors.
 */
import { el, icon } from './dom';

export interface DialogOptions {
  title: string;
  /** Shown above the title, e.g. "New resource". */
  kicker?: string;
  wide?: boolean;
  /**
   * Called when the dialog is about to close by Escape, the close button or
   * Cancel. Return false to keep it open (e.g. to confirm discarding changes).
   */
  beforeClose?: () => boolean;
}

export interface Dialog {
  root: HTMLDialogElement;
  /** Replace the scrolling body. */
  body: HTMLElement;
  /** Replace the footer's contents (actions). */
  footer: HTMLElement;
  setTitle(title: string): void;
  /** Close without asking beforeClose. */
  close(): void;
  /** Close as if the admin cancelled (asks beforeClose). */
  requestClose(): void;
}

let dialogCount = 0;

export function openDialog(opts: DialogOptions): Dialog {
  const titleId = `dialog-title-${++dialogCount}`;
  const title = el('h2', { class: 'dialog__title', id: titleId }, opts.title);
  const body = el('div', { class: 'dialog__body' });
  const footer = el('div', { class: 'dialog__footer' });
  const closeBtn = el(
    'button',
    { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', 'aria-label': 'Close' },
    icon('x')
  );
  const root = el(
    'dialog',
    { class: `dialog${opts.wide ? ' dialog--wide' : ''}`, 'aria-labelledby': titleId },
    el(
      'div',
      { class: 'dialog__header' },
      el('div', {}, opts.kicker && el('span', { class: 'kicker' }, opts.kicker), title),
      closeBtn
    ),
    body,
    footer
  );

  const close = () => {
    if (root.open) root.close();
    root.remove();
  };
  const requestClose = () => {
    if (opts.beforeClose && !opts.beforeClose()) return;
    close();
  };

  closeBtn.addEventListener('click', requestClose);
  // The browser may close a modal itself (Chrome does on a second Escape without
  // a click in between, skipping "cancel"); treat that as discarding.
  root.addEventListener('close', () => root.remove());
  root.addEventListener('cancel', (e) => {
    e.preventDefault();
    requestClose();
  });

  document.body.appendChild(root);
  root.showModal();
  return {
    root,
    body,
    footer,
    setTitle: (t) => (title.textContent = t),
    close,
    requestClose,
  };
}
