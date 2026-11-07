import { el, icon } from './dom';

export type ToastTone = 'info' | 'error' | 'warn';

/** Non-blocking notice, bottom right. Errors stay until dismissed. */
export function toast(message: string, tone: ToastTone = 'info'): void {
  const host = document.getElementById('toasts');
  if (!host) return;
  const node = el('div', {
    class: `toast${tone === 'info' ? '' : ` toast--${tone}`}`,
    role: 'status',
  });
  const close = el(
    'button',
    { class: 'toast__close', type: 'button', 'aria-label': 'Dismiss' },
    icon('x')
  );
  close.addEventListener('click', () => node.remove());
  node.append(el('span', {}, message), close);
  host.appendChild(node);
  if (tone !== 'error') setTimeout(() => node.remove(), 5000);
}
