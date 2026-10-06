const fs = require('node:fs');
const path = require('node:path');

// Include the supplied texts, not only SPDX identifiers. The inventory makes
// packages without a supplied notice explicit for final archive/license review.
function writeNotices(root, output, requirePods = false) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const sections = [
    'Termforge third-party acknowledgements',
    fs.readFileSync(path.join(root, 'docs/native-dependency-notices.md'), 'utf8'),
  ];
  const bcrypt = path.join(root, 'native/Vendor/Citadel/Sources/CCitadelBcrypt');
  for (const name of ['blf.c', 'blf.h', 'bcrypt.c']) {
    const comments =
      fs.readFileSync(path.join(bcrypt, name), 'utf8').match(/\/\*[\s\S]*?\*\//g) || [];
    sections.push(
      `\n## Citadel CCitadelBcrypt ${name}\n` +
        comments.filter((text) => /Copyright/.test(text)).join('\n'),
    );
  }
  sections.push('This product includes software developed by Niels Provos.');
  // The now-explicit BoringSSL product has retained per-file upstream notices.
  const boring = path.join(root, 'native/Vendor/swift-crypto/Sources/CCryptoBoringSSL');
  const headers = new Set();
  for (const name of fs.readdirSync(boring, { recursive: true })) {
    if (!/\.(?:c|cc|h|S|inc)$/.test(name)) continue;
    const source = fs.readFileSync(path.join(boring, name), 'utf8');
    const blocks = source.slice(0, 20000).match(/\/\*[\s\S]*?\*\//g) || [];
    for (const text of blocks) {
      if (/copyright|redistribution|permission|license/i.test(text)) headers.add(text);
    }
  }
  sections.push(
    '\n## Swift Crypto BoringSSL retained source notices\n' + [...headers].sort().join('\n\n'),
  );

  const missing = [];
  let count = 0;
  for (const [relative, entry] of Object.entries(lock.packages).sort()) {
    if (!relative || entry.dev) continue;
    const directory = path.join(root, relative);
    if (entry.optional && !fs.existsSync(directory)) continue;
    const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
    const names = fs
      .readdirSync(directory)
      .filter(
        (name) =>
          /^(licen[cs]e|copying|notice)(\.|$|-)/i.test(name) &&
          fs.statSync(path.join(directory, name)).isFile(),
      );
    sections.push(
      `\n## ${pkg.name} ${pkg.version}\nLicense: ${JSON.stringify(pkg.license || 'not specified')}\n`,
    );
    for (const name of names) sections.push(fs.readFileSync(path.join(directory, name), 'utf8'));
    if (!names.length) missing.push(`${pkg.name} ${pkg.version}`);
    count++;
  }
  const pods = path.join(
    root,
    'ios/Pods/Target Support Files/Pods-Termforge/Pods-Termforge-acknowledgements.markdown',
  );
  if (fs.existsSync(pods)) sections.push(fs.readFileSync(pods, 'utf8'));
  else if (requirePods) throw new Error('CocoaPods acknowledgement texts are missing.');
  sections.push('\n## Packages without a supplied top-level notice\n' + missing.join('\n'));
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, sections.join('\n\n') + '\n');
  console.log(
    `Acknowledgements: ${count} npm packages, native texts${fs.existsSync(pods) ? ', CocoaPods texts' : ''}; ${missing.length} npm notice gaps require license review.`,
  );
}
module.exports = { writeNotices };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  writeNotices(
    root,
    path.join(root, 'ios/TermforgeAcknowledgements.txt'),
    process.argv.includes('--require-pods'),
  );
}
