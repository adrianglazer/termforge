# Termforge's Citadel patch

Upstream: Citadel **0.12.1**, commit
`ae8562f895de06ccb86fdb1cbb65fd99c8976e12`.
The original MIT license and source copyright notices are retained.

`termforge.patch` is the complete diff from that release's package manifest and
library source. `source-manifest.json` records hashes of the vendored files.

- Expose `SSHClientSettings.loginTimeout` (upstream default remains 10 seconds).
  Termforge chooses 150 seconds while native secure entry expires after 120.
  This permits credential entry **after** actual SSH host validation. Raising
  `connectTimeout` alone does not change upstream's hard-coded login deadline.
- Schedule synchronous NIO pipeline setup on its owning event loop. The real
  transport test reproduced an upstream precondition crash through the public
  async `connect(on:settings:)` API before this fix.
- Resume paused transport reads only after SSH pipeline installation, including
  an explicit read for the NIOSSH child-channel implementation. The loopback
  bastion test covers this startup race.
- Remove the unused `_CryptoExtras` product dependency. Citadel's library does
  not import it; the app does not need its DER/PEM RSA parser affected by
  GHSA-8q93-f6xh-4f6f. This is reachability removal, not a claim that the pinned
  Swift Crypto package has no advisories.
- Explicitly depend on the existing `CCryptoBoringSSL` C product exposed by the
  manifest-only patch in `../swift-crypto`. On Apple, `Crypto` uses CryptoKit and
  does not expose this module; `_CryptoExtras` had supplied it incidentally.
  Build 3 revealed this gap. Its RSA parser product remains excluded.
- Omit example/test targets and their example-only ColorizeSwift dependency.
  Termforge's network tests compile this actual library and exercise the timeout.

The Xcode plugin uses a local package reference, not a mutable downloaded patch.
The native harness uses the same local package. Do not edit vendored sources
without updating the patch, source hashes, review record and affected tests.
Run `node scripts/verify-native-security.js`; after Expo prebuild it also checks
Xcode pins and the generated workspace lockfile. A future upstream release can
replace this local patch only after verifying the deferred-authentication test.
