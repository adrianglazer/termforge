const fs = require('node:fs');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');

const app = require('../app.json').expo;
const eas = require('../eas.json');
assert.ok(Number(process.versions.node.split('.')[0]) >= 22, 'Use the supported Node runtime.');
assert.match(app.ios.bundleIdentifier, /^[a-zA-Z][\w]*(\.[\w]+)+$/);
assert.ok(!app.ios.bundleIdentifier.startsWith('com.example.'));
assert.match(app.extra.eas.projectId, /^[a-f0-9-]{36}$/);
assert.equal(eas.cli.appVersionSource, 'remote');
assert.equal(eas.build.development.developmentClient, true);
assert.equal(eas.build.development.distribution, 'internal');
assert.equal(eas.build.preview.distribution, 'internal');
assert.equal(eas.build.production.distribution, 'store');
assert.equal(eas.build.production.autoIncrement, true);
assert.equal({ ...eas.build.base.ios, ...eas.build.production.ios }.simulator, false);
assert.equal(eas.build.production.ios.buildConfiguration, 'Release');
assert.ok(eas.submit.production.ios);
require('./verify-native-security');

// Scan the prospective source upload, including untracked task work. Report only
// paths/rules, never matching values. This bounded scan is not an entropy audit.
const files = [
  ...new Set(
    execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])
      .toString()
      .split('\0')
      .filter(Boolean),
  ),
];
const rules = [
  [
    'private key material',
    /^-----BEGIN (?:RSA |EC |OPENSSH |DSA |ENCRYPTED )?PRIVATE KEY-----\r?$/m,
  ],
  ['GitHub token', /\b(?:gh[pousr]_[a-zA-Z0-9]{36,}|github_pat_[a-zA-Z0-9_]{60,})\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  [
    'credential assignment',
    /(?:EXPO_TOKEN|EXPO_APPLE_APP_SPECIFIC_PASSWORD|NPM_TOKEN)\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}/,
  ],
];
const findings = [];
for (const file of files) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  if (/(?:^|\/)(?:\.env(?:\..*)?|credentials\.json)$|\.(?:p8|p12|mobileprovision)$/.test(file)) {
    findings.push(`${file}: credential file`);
  }
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0)) continue;
  for (const [name, pattern] of rules) {
    // Public, byte-identical upstream ASN.1 test vector; never an app credential.
    const publicFixture =
      name === 'private key material' &&
      file === 'native/Vendor/swift-crypto/Tests/CryptoTests/ASN1/ASN1Tests.swift' &&
      crypto.createHash('sha256').update(bytes).digest('hex') ===
        '082cea9f1e36a1a395e6418bd01022f5aa6d6495db8446025ec6024e7064f6b9';
    if (!publicFixture && pattern.test(bytes.toString('utf8'))) findings.push(`${file}: ${name}`);
  }
}
assert.equal(findings.length, 0, `Secret scan requires review:\n${findings.join('\n')}`);
console.log(`Release configuration and bounded secret scan passed (${files.length} source files).`);
