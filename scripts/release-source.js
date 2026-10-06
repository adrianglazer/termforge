const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const digest = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args);
const paths = [
  ...new Set(
    git('ls-files', '-z', '--cached', '--others', '--exclude-standard')
      .toString()
      .split('\0')
      .filter(Boolean),
  ),
].sort();
const files = Object.fromEntries(
  paths
    .filter((p) => fs.existsSync(p) && fs.statSync(p).isFile())
    .map((p) => [p, digest(fs.readFileSync(p))]),
);
const patch = git('diff', '--binary', 'HEAD');
const manifest = {
  revision: git('rev-parse', 'HEAD').toString().trim(),
  dirty: git('status', '--porcelain').length > 0,
  trackedPatchSha256: digest(patch),
  sourceSha256: digest(JSON.stringify(files)),
  files,
};
fs.mkdirSync('.release', { recursive: true });
fs.writeFileSync('.release/source.json', JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync('.release/working-tree.patch', patch);
console.log(`${manifest.revision.slice(0, 12)} source-sha256=${manifest.sourceSha256}`);
