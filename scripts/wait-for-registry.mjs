import { readFile } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';

const pkg = JSON.parse(await readFile(new URL('../packages/design-system/package.json', import.meta.url)));
const version = process.argv[2];
const url = `https://registry.npmjs.org/${encodeURIComponent(pkg.name)}`;
for (let attempt = 0; attempt < 60; attempt++) {
  try {
    const response = await fetch(url, {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      const metadata = await response.json();
      const visible = version
        ? metadata.versions?.[version]?.gitHead === process.env.GITHUB_SHA
        : Object.keys(metadata.versions ?? {}).length > 0;
      if (visible) {
        console.log(`${pkg.name}${version ? `@${version}` : ''} is visible on npm.`);
        process.exit(0);
      }
    } else if (response.status !== 404 && response.status !== 429 && response.status < 500) {
      throw new Error(`Unexpected registry status: ${response.status}`);
    }
  } catch (error) {
    // Retry connection errors/timeouts, but surface other failures immediately.
    if (!['TimeoutError', 'TypeError'].includes(error.name)) throw error;
  }
  console.log(`Waiting for npm processing (${attempt + 1}/60)...`);
  await setTimeout(10_000);
}
throw new Error('npm package is not visible yet. Rerun this workflow after registry processing finishes.');
