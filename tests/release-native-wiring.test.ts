import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { verifyXcodeSource } = require('../scripts/verify-native-security.js') as {
  verifyXcodeSource: (source: string, pins: { location: string; identity: string }[]) => void;
};
const location = 'https://github.com/apple/swift-nio.git';
const pins = [{ location, identity: 'swift-nio' }];

describe('release native package verification', () => {
  it('accepts Expo and CocoaPods representations of the reviewed local package', () => {
    for (const value of ['"../native/Vendor/Citadel"', '../native/Vendor/Citadel']) {
      expect(() => verifyXcodeSource(`relativePath = ${value};\n${location}`, pins)).not.toThrow();
    }
  });
  it('rejects a different local package, remote Citadel or missing native pin', () => {
    for (const source of [
      `relativePath = ../native/Vendor/Citadel-other;\n${location}`,
      `relativePath = ../native/Vendor/Citadel;\n${location}\nhttps://github.com/orlandos-nl/Citadel.git`,
      'relativePath = ../native/Vendor/Citadel;',
    ]) {
      expect(() => verifyXcodeSource(source, pins)).toThrow();
    }
  });
});
