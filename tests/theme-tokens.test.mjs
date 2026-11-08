import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isThemePreference, resolveTheme} from '../packages/design-system/src/lib/theme.ts';

const css = readFileSync(new URL('../packages/design-system/src/styles/tokens.css', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** Declarations of the first rule whose selector list exactly matches `selector`. */
function block(selector, source = css) {
  const escaped = selector.replace(/[[\]().*+?^$|\\]/g, '\\$&').replace(/\s+/g, '\\s*');
  const match = new RegExp(`(?:^|[}\\s])${escaped}\\s*\\{([^}]*)\\}`).exec(source);
  assert.ok(match, `missing ${selector}`);
  const tokens = new Map();
  for (const [, name, value] of match[1].matchAll(/(--[\w-]+|color-scheme)\s*:\s*([^;]+);/g))
    tokens.set(name, value.replace(/\s+/g, ' ').trim());
  return tokens;
}

const shared = block(':root');
const light = block(':root, [data-theme="light"], [data-theme="system"]');
const dark = block('[data-theme="dark"]');
const media = /@media \(prefers-color-scheme: dark\)\s*\{([\s\S]*?\})\s*\}/.exec(css);
assert.ok(media, 'missing system dark media block');
const systemDark = block('[data-theme="system"]', media[1]);

test('system dark mirrors the explicit dark theme exactly', () => {
  assert.deepEqual([...systemDark], [...dark]);
});

test('every theme token has light and dark values; none are left in the shared block', () => {
  assert.deepEqual([...light.keys()].sort(), [...dark.keys()].sort());
  for (const [name, value] of shared)
    assert.doesNotMatch(value, /#[0-9a-f]{3,8}\b|rgb\(|var\(--(line|surface|ink|brand)/i, `${name} is colour-dependent`);
  assert.equal(light.get('color-scheme'), 'light');
  assert.equal(dark.get('color-scheme'), 'dark');
});

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum ratio]
const pairs = [
  ['--ink-body', '--surface-page', 7],
  ['--ink-body', '--surface-card', 7],
  ['--ink-strong', '--surface-raised', 7],
  ['--ink-secondary', '--surface-raised', 4.5],
  ['--ink-muted', '--surface-card', 4.5],
  ['--ink-muted', '--surface-banner', 4.5],
  ['--ink-muted', '--surface-hero', 4.5],
  ['--brand-green', '--surface-page', 4.5],
  ['--brand-green', '--surface-raised', 4.5],
  ['--brand-green', '--brand-green-tint', 4.5],
  ['--ink-on-brand', '--brand-green', 4.5],
  ['--ink-on-brand', '--brand-green-hover', 4.5],
  ['--ink-on-brand', '--signal-orange', 4.5],
  ['--ink-on-brand', '--signal-orange-hover', 4.5],
  ['--brand-brass-text', '--surface-card', 4.5],
  ['--brand-brass-text', '--brand-brass-tint', 4.5],
  ['--signal-orange-text', '--surface-card', 4.5],
  ['--signal-orange-text', '--signal-orange-tint', 4.5],
  ['--ink-on-deep', '--surface-deep', 7],
  ['--ink-on-deep-muted', '--surface-deep', 4.5],
  ['--line-control', '--surface-raised', 3],
];
// Status dots always sit beside a text label, so they are not checked here;
// the inherited light brass dot is below 3:1 against cards.

for (const [name, theme] of [['light', light], ['dark', dark]]) {
  test(`${name} theme meets WCAG contrast for its text and control pairs`, () => {
    for (const [fg, bg, minimum] of pairs) {
      const ratio = contrast(theme.get(fg), theme.get(bg));
      assert.ok(ratio >= minimum, `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}, needs ${minimum}`);
    }
  });
}

test('theme preferences resolve system against the operating system setting', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
  assert.equal(resolveTheme('light', true), 'light');
  assert.ok(['light', 'dark', 'system'].every(isThemePreference));
  assert.ok(![undefined, null, '', 'auto', 'Dark'].some(isThemePreference));
});
