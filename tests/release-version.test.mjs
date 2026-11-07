import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseVersion } from '../scripts/release-version.mjs';

const sha = 'a'.repeat(40);
test('first release uses source version', () => {
  assert.equal(releaseVersion('0.3.0', {}, sha), '0.3.0');
});
test('patch releases follow the highest stable version, not lexical order', () => {
  assert.equal(releaseVersion('0.3.0', {
    '0.3.9': {}, '0.3.10': {}, '1.0.0-beta.1': {},
  }, sha), '0.3.11');
});
test('explicit minor and major bumps are honored', () => {
  assert.equal(releaseVersion('0.4.0', { '0.3.12': {} }, sha), '0.4.0');
  assert.equal(releaseVersion('1.0.0', { '0.3.12': {} }, sha), '1.0.0');
});
test('reruns skip commits already published, even behind newer versions', () => {
  assert.equal(releaseVersion('0.3.0', {
    '0.3.0': { gitHead: sha }, '0.3.1': { gitHead: 'b'.repeat(40) },
  }, sha), null);
});
test('invalid source versions and commit IDs fail closed', () => {
  assert.throws(() => releaseVersion('0.4.0-beta.1', {}, sha));
  assert.throws(() => releaseVersion('0.3.0', {}, ''));
});
