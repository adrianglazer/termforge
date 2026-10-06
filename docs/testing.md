# Testing and validation

## Reproducible local checks

Use Node 22.23.1 or newer, then run:

```sh
npm test
npm run lint
npm run typecheck
npm run format
```

The repository's supported package manager is pnpm; npm was used for the
record below because pnpm was unavailable on the validation host.

## Task 05 result — 2026-10-05

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run format`: passed.
- `npm test`: 35 tests passed and 2 SQLite integration tests were blocked by
  the host's Node 20 runtime loading a `better-sqlite3` binary built for Node
  22 (`NODE_MODULE_VERSION 137`, current runtime 115). Re-run the complete
  suite under Node 22 after dependencies are installed for that runtime.
- No EAS build ID or TestFlight build number was produced for this task. The
  shared candidate is intentionally deferred to task 08 under `tasks/README.md`.

## Coverage status

Local coverage includes validation and imports/exports, redaction, pane trees
and dimensions, settings/snippets, session transitions and isolation, trust
decisions, SQLite migration/reopen/rollback, SFTP
CRUD/editor/interruption/integrity, malformed terminal input, Unicode and
long-output bounds, concurrent transfers, and four-session stress scenarios.

The following remain device-only or unavailable on this Linux host: full iOS/
UIKit compilation, native terminal rendering and touch/keyboard behavior,
Keychain/biometric behavior, iOS lifecycle suspension, physical accessibility
and memory measurements, and signed install/TestFlight acceptance. These are
pending for the consolidated task 08 candidate session; they are not treated
as passed by local mocks.

Disposable SSH/Docker fixture coverage and native integration evidence from
task 03 remain historical evidence; no new device or EAS build was performed
here.

## Task 06 hardening result — 2026-10-05

- The complete suite passes under the installed Node 24.4.1 runtime: 9 test
  files and 41 tests, including both real-SQLite integration tests. This clears
  task 05's Node-ABI blocker without weakening or skipping those assertions.
- The local stress suite covers a 100,000-line Unicode/escape-sequence fixture,
  the 16 KiB paste boundary, byte-safe retention, four isolated sessions,
  generation/sequence ordering, rapid stale reconnect events, and concurrent
  same-session transfer cancellation. The 100,000-line fixture completed in
  377 ms in the full Vitest run; this measures the local boundary helper, not
  native UIKit rendering or end-to-end terminal latency.
- `npm run lint`, `npm run typecheck`, `npm run format`, `git diff --check`,
  Expo public-config evaluation, and an iOS Metro export pass. The export
  contains 1,176 modules and a 2.7 MB Hermes bundle. These checks validate JS
  resolution/configuration only; Linux still cannot compile the changed Swift.
- Dependency licenses and notice obligations are inventoried in
  `docs/dependency-licenses.md`. No dependency or native package version was
  changed.
- No EAS/TestFlight build was created. Native compilation and the compact
  physical-iPhone performance/lifecycle check remain deliberately pending for
  task 08's consolidated candidate.

## Task 07 security review result — 2026-10-06

- Node 24.4.1: **63 tests pass, 12 files**. Real SQLite covers atomic stale trust
  rejection and committed pending-deletion recovery; metadata bootstrap covers
  lock during initialization, close/reopen and protection failure.
- Swift 6.2.4 in `swift:6.2-noble`: **14 native tests pass**. The same native
  output/KDF gates and forwarding/transport implementation run against the
  reviewed dependency graph. Real loopback SSH verifies deferred credentials
  beyond ten seconds, wrong-host rejection and a bastion. Disposable ssh-keygen
  fixtures verify plaintext/encrypted Ed25519 import and incorrect-passphrase
  rejection. Slow-peer backpressure, accepted-channel caps/close and control-string
  bounds are executed tests, not JS substitutes for native code.
- All iOS Swift files pass syntax parsing. Linux cannot typecheck UIKit, Keychain,
  LocalAuthentication or Expo's Apple module integration. Those checks remain in
  the shared candidate; portable native success is not a full iOS compilation.
- Lint, typecheck, format, diff whitespace, Expo iOS prebuild, generated package/
  lockfile/module-scope checks and iOS Metro/Hermes export pass. Vendored source
  hashes and eleven remote pins pass `node scripts/verify-native-security.js`.
- Current advisory checks completed with the matches and mitigations recorded in
  `dependency-security-review.md`; no clean audit is claimed. No EAS build/upload
  or physical-device validation was performed.

Reproduce native checks with Swift 6.2+ and `/usr/bin/ssh-keygen`:

```sh
swift test --package-path native --jobs 4
node scripts/verify-native-security.js
```

On Linux the review used the official Swift container, the native directory
mounted at `/work`, a writable temporary compiler cache, and the host UID plus
read-only `/etc/passwd` (ssh-keygen requires a valid user record). Fixture keys
are created in a private temporary directory and removed after the test. No real
credential or external server is used. The initial dependency resolution needs
network access; subsequent tests run with container networking disabled and use
loopback only. `native/.build` and native test sources are excluded from the app's
inline-module scan.

## Release preparation checks

`npm run release:check` adds native provenance/config verification, a bounded
source secret scan and diff whitespace checks to the four standard commands.
CI installs with `npm ci` on Node 24.4.1 and runs that same command; it never
creates a cloud build or upload. `npm run format:release` also checks the release
documents, scripts and workflow.

The secret scan covers tracked and untracked nonignored prospective upload
files, rejects credential-file paths and recognizes PEM/OpenSSH private-key
blocks, GitHub/AWS tokens and selected secret assignments. It reports only
paths/rules. The public upstream Swift Crypto ASN.1 test key is allowed only at its
reviewed path and exact SHA-256; modified material still fails. It is not a
complete credential/entropy scan; ignored owner secrets
must remain outside uploads and exports. Review screenshots and user content
separately.

Configuration validation uses the installed EAS CLI's schema/resolver for all
three profiles, plus authenticated `eas config` for production. Shell syntax and
invalid/missing upload inputs are checked without creating submissions. Expo
prebuild exercises acknowledgement resource registration and package wiring;
the post-install hook requires CocoaPods notice texts on the Apple worker.
Archive contents and Apple API compilation are candidate gates, not local passes.

Before a candidate, use `npm run release:source` to retain the source manifest
and dirty patch in ignored `.release/`. These include earlier task work and
untracked native sources; they are not replaced by a Git commit identifier.
See [EAS](eas.md) and [release checklist](release-checklist.md) for signed-build,
TestFlight and physical evidence. Task 08 records the actual results.

## Task 08 executable acceptance — 2026-10-06

- **65 JavaScript tests/13 files pass**, including quoted/unquoted CocoaPods package
  path regression coverage. Lint, TypeScript, formatting, diff whitespace and the
  bounded source/fixture-aware secret scan pass on Node 24.4.1.
- **14 native tests pass again** after the Swift Crypto manifest-only C-product fix,
  using Swift 6.2.4 with networking disabled except loopback. Ten remote pins and
  two reviewed local baselines are verified; 1,013 vendored source/notice/patch
  file hashes pass. The native test link list has no `_CryptoExtras` objects.
- Expo iOS prebuild and iOS Metro/Hermes export pass. Generated acknowledgement
  resource/package scope/wiring and EAS schema/profile resolution pass.
- **Actual Apple compilation/archive passes** for production candidate
  `e8ed6faa-1017-407a-a86c-f86ca237eba8`, version **0.1.0/build 4**, on the configured
  Xcode 26.6 image. Its 55,267-line Xcode log has no compiler error or `_CryptoExtras`
  target/object mention and resolves both reviewed local packages plus the ten
  remote versions. This now establishes Apple API compilation, not device behavior.
- The exported IPA has the configured bundle ID, iOS 17 minimum, build/version,
  existing encryption declaration and distribution profile with `get-task-allow=false`.
  Its acknowledgement resource includes native, Citadel C, BoringSSL, npm and CocoaPods
  texts. Eleven privacy manifests, including the main app's required-reason declarations,
  are present and declare no tracking/collected data. Final owner privacy/notice review
  and physical behavior remain separate gates.
- npm/OSV advisory reports remain non-clean as documented. Worker Expo Doctor is
  **20/21**, with five patch-version alignment recommendations; it is not marked passed
  or suppressed. See task 08 for exact versions and the two diagnosed failed attempts.

The original source snapshot, dirty patch, manifest-only patches, archived IPA,
inspection JSON and cloud logs are retained in ignored `.release/`/`native/.build`.
Task 08 records distribution/processing results and the compact physical checklist.
No installation, biometric/Keychain, Files-provider, lifecycle, accessibility or
four-session device result is inferred from a compiled or uploaded binary.
