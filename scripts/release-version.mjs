const stable = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const compare = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
};

export function releaseVersion(minimum, versions, sha) {
  if (!stable.test(minimum)) throw new Error('Source version must be stable semver');
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('Expected a full Git commit SHA');
  const entries = Object.entries(versions);
  if (entries.some(([, metadata]) => metadata.gitHead === sha)) return null;
  const published = entries.map(([v]) => v).filter(v => stable.test(v))
    .map(v => v.split('.').map(Number)).sort(compare);
  const latest = published.at(-1);
  if (!latest || compare(minimum.split('.').map(Number), latest) > 0) return minimum;
  latest[2]++;
  return latest.join('.');
}

/** The highest stable published version and the commit it was built from. */
export function latestPublished(versions) {
  const published = Object.entries(versions).filter(([v]) => stable.test(v))
    .map(([v, metadata]) => ({ version: v, parts: v.split('.').map(Number), gitHead: metadata?.gitHead ?? null }))
    .sort((a, b) => compare(a.parts, b.parts));
  const latest = published.at(-1);
  return latest ? { version: latest.version, gitHead: latest.gitHead } : null;
}

/**
 * Why this commit should not be published, or null to publish it.
 * `isAncestor` (this commit is in the latest release's history) and
 * `packageChanged` (anything under packages/design-system differs from it)
 * are null when git could not compare, for example a gitHead missing from
 * the history; then the commit is published, as before.
 */
export function skipReason({ latest, isAncestor, packageChanged }) {
  if (!latest?.gitHead) return null;
  const ref = `${latest.version} (${latest.gitHead.slice(0, 7)})`;
  if (isAncestor === true) return `this commit is older than ${ref}, already published`;
  if (packageChanged === false) return `nothing in packages/design-system changed since ${ref}`;
  return null;
}
