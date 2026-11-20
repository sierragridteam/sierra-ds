import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { latestPublished, releaseVersion, skipReason } from './release-version.mjs';

if (process.env.GITHUB_REF !== 'refs/heads/main' || !process.env.GITHUB_OUTPUT) {
  throw new Error('Releases must run on main in GitHub Actions');
}
// The commit CI tested (workflow_run's head_sha), which is not GITHUB_SHA
// when the release runs after CI: that is main's tip at the time.
const sha = process.env.RELEASE_SHA || process.env.GITHUB_SHA;
const path = new URL('../packages/design-system/package.json', import.meta.url);
const pkg = JSON.parse(await readFile(path, 'utf8'));
const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg.name)}`, {
  signal: AbortSignal.timeout(30_000),
});
let versions = {};
if (response.ok) {
  const metadata = await response.json();
  if (!metadata.versions || typeof metadata.versions !== 'object') {
    throw new Error('Registry response is missing versions');
  }
  versions = metadata.versions;
} else {
  throw new Error(`Registry lookup failed: HTTP ${response.status}`);
}

// git's exit status as a boolean, or null when it could not answer (an
// unknown commit, a shallow checkout).
const git = (...args) => {
  const result = spawnSync('git', args, { stdio: 'ignore' });
  if (result.status === 0) return true;
  if (result.status === 1) return false;
  return null;
};

const skip = async reason => {
  console.log(`Not publishing: ${reason}.`);
  await appendFile(process.env.GITHUB_OUTPUT, 'publish=false\n');
};

const version = releaseVersion(pkg.version, versions, sha);
if (version === null) {
  await skip('this commit is already published');
} else {
  const latest = latestPublished(versions);
  const known = latest?.gitHead && git('cat-file', '-e', `${latest.gitHead}^{commit}`) === true;
  const reason = skipReason({
    latest,
    isAncestor: known ? git('merge-base', '--is-ancestor', sha, latest.gitHead) : null,
    packageChanged: known ? (() => {
      const same = git('diff', '--quiet', latest.gitHead, sha, '--', 'packages/design-system');
      return same === null ? null : !same;
    })() : null,
  });
  if (reason) {
    await skip(reason);
  } else {
    pkg.version = version;
    pkg.gitHead = sha;
    await writeFile(path, `${JSON.stringify(pkg, null, 2)}\n`);
    await appendFile(process.env.GITHUB_OUTPUT, `publish=true\nversion=${version}\n`);
    console.log(`Prepared ${pkg.name}@${version}`);
  }
}
