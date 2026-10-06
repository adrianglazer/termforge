const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const vendor = path.join(root, 'native/Vendor/Citadel');
let verifiedFiles = 0;
for (const relative of ['native/Vendor/Citadel', 'native/Vendor/swift-crypto']) {
  const directory = path.join(root, relative);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'source-manifest.json'), 'utf8'));
  for (const [file, expected] of Object.entries(manifest.sha256)) {
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, file))).digest('hex');
    assert.equal(actual, expected, `Vendored source changed without review: ${relative}/${file}`);
    verifiedFiles++;
  }
}
const cryptoPackage = fs.readFileSync(path.join(root, 'native/Vendor/swift-crypto/Package.swift'), 'utf8');
assert.ok(cryptoPackage.includes('.library(name: "CCryptoBoringSSL", targets: ["CCryptoBoringSSL"])'));
const packageSource = fs.readFileSync(path.join(vendor, 'Package.swift'), 'utf8');
assert.ok(
  !packageSource.includes('"_CryptoExtras"'),
  'Unused vulnerable RSA parser must not be linked',
);
const lock = JSON.parse(fs.readFileSync(path.join(root, 'native/Package.resolved'), 'utf8'));
assert.equal(lock.pins.length, 10);
for (const pin of lock.pins) {
  assert.match(pin.state.revision, /^[a-f0-9]{40}$/);
  assert.match(pin.state.version, /^\d+\.\d+\.\d+$/);
}
const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
assert.deepEqual(app.expo.experiments.inlineModules.watchedDirectories, [
  'native/TermforgeNative',
  'native/TermforgeNativeProbe',
]);
const projectPath = path.join(root, 'ios/Termforge.xcodeproj/project.pbxproj');
if (fs.existsSync(projectPath)) {
  const project = fs.readFileSync(projectPath, 'utf8');
  verifyXcodeSource(project, lock.pins);
  assert.match(project, /relativePath\s*=\s*"?\.\.\/native\/Vendor\/swift-crypto"?\s*;/);
  assert.ok(!project.includes('https://github.com/apple/swift-crypto.git'));
  const candidateLock = JSON.parse(
    fs.readFileSync(
      path.join(root, 'ios/Termforge.xcworkspace/xcshareddata/swiftpm/Package.resolved'),
      'utf8',
    ),
  );
  assert.deepEqual(candidateLock.pins, lock.pins);
}
console.log(
  `Verified ${verifiedFiles} vendored files, 10 remote pins, and native module scope.`,
);

// CocoaPods/Xcodeproj removes optional quotes when reserializing safe paths.
// Accept both representations of the same reviewed path, never another package.
function verifyXcodeSource(project, pins) {
  assert.match(project, /relativePath\s*=\s*"?\.\.\/native\/Vendor\/Citadel"?\s*;/);
  assert.ok(!project.includes('https://github.com/orlandos-nl/Citadel.git'));
  for (const pin of pins)
    assert.ok(project.includes(pin.location), `Missing Xcode pin: ${pin.identity}`);
}
module.exports = { verifyXcodeSource };
