import { test } from 'node:test';
import assert from 'node:assert/strict';
import { latestPublished, releaseVersion, skipReason } from '../scripts/release-version.mjs';

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

const head = 'c'.repeat(40);
test('latestPublished is the highest stable version and its commit', () => {
  assert.deepEqual(latestPublished({
    '0.3.9': { gitHead: 'b'.repeat(40) }, '0.3.10': { gitHead: head }, '1.0.0-beta.1': { gitHead: sha },
  }), { version: '0.3.10', gitHead: head });
  assert.deepEqual(latestPublished({ '0.3.0': {} }), { version: '0.3.0', gitHead: null });
  assert.equal(latestPublished({}), null);
});
test('a commit that changes nothing in the package is not published', () => {
  const latest = { version: '0.9.11', gitHead: head };
  assert.match(skipReason({ latest, isAncestor: false, packageChanged: false }), /nothing in packages\/design-system changed since 0\.9\.11 \(ccccccc\)/);
  assert.equal(skipReason({ latest, isAncestor: false, packageChanged: true }), null);
});
test('a commit older than the latest release is not published over it', () => {
  // CI for an earlier merge can finish after a later one has been released.
  const latest = { version: '0.9.11', gitHead: head };
  assert.match(skipReason({ latest, isAncestor: true, packageChanged: true }), /older than 0\.9\.11/);
});
test('when git cannot compare, or nothing is published yet, the commit is published', () => {
  assert.equal(skipReason({ latest: { version: '0.9.11', gitHead: head }, isAncestor: null, packageChanged: null }), null);
  assert.equal(skipReason({ latest: { version: '0.9.11', gitHead: null }, isAncestor: false, packageChanged: false }), null);
  assert.equal(skipReason({ latest: null, isAncestor: null, packageChanged: null }), null);
});
