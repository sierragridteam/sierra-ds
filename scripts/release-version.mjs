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
