import { readFile, writeFile, appendFile } from 'node:fs/promises';
import { releaseVersion } from './release-version.mjs';

if (process.env.GITHUB_REF !== 'refs/heads/main' || !process.env.GITHUB_OUTPUT) {
  throw new Error('Releases must run on main in GitHub Actions');
}
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
const version = releaseVersion(pkg.version, versions, process.env.GITHUB_SHA);
if (version === null) {
  console.log('This commit is already published.');
  await appendFile(process.env.GITHUB_OUTPUT, 'publish=false\n');
} else {
  pkg.version = version;
  pkg.gitHead = process.env.GITHUB_SHA;
  await writeFile(path, `${JSON.stringify(pkg, null, 2)}\n`);
  await appendFile(process.env.GITHUB_OUTPUT, `publish=true\nversion=${version}\n`);
  console.log(`Prepared ${pkg.name}@${version}`);
}
