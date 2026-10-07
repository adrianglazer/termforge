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

### Terminal keyboard toggle — 2026-10-06

The terminal accessory toolbar now keeps a Hide keyboard / Show keyboard button
fixed beside the horizontally scrolling shortcuts. Hide ends native editing and
releases terminal focus without disconnecting or replacing the terminal; Show
focuses the attached terminal. Existing tap-to-focus behavior is unchanged. The
button label follows iOS keyboard visibility events, including composer/search
input, rather than assuming a button press is the only way to open the keyboard.

Local validation: 73 JavaScript tests passed, with lint, TypeScript, formatting,
and Swift syntax parsing for both changed native files passing. Linux parsing
does not verify UIKit compilation or keyboard behavior. Include this native change
in the next consolidated candidate; no extra EAS build was run for it.

Pending candidate smoke: on a connected terminal, tap to type, hide the keyboard,
confirm the terminal expands and output/session continue, then tap the terminal
and use Show keyboard to reopen it. Check portrait/landscape and dismissing the
Unicode composer/search keyboard; verify the toggle remains visible while the
shortcut row scrolls. Confirm PTY resize follows the available terminal area.

### Protected-data startup failure — 2026-10-06

A tester reported that the distributed candidate immediately showed “Protected
storage could not be opened” on an unlocked device. This is an unresolved device
acceptance blocker until a corrected candidate launches successfully; prior local
SQLite tests did not establish iOS startup behavior.

Code inspection identified a cold-launch/lifecycle race: native storage requires
an active app, while the JavaScript gate could start during inactive and then
ignore the active snapshot because its security revision was unchanged. The gate
now waits for active, allows same-revision recovery, serializes initialization,
and invalidates late results on background/lock/disposal. A Retry action and fixed
startup-stage labels replace the misleading blanket device-lock explanation.
Storage preparation, database opening, migrations, protection, key cleanup,
inventory, and settings failures remain fail-closed and are distinguishable
without rendering raw native errors, SQL, file paths, or credentials.

New regression tests cover cold launch, unchanged-revision recovery, stale/late
results during lock and disposal, serialized interruption recovery, and sanitized
storage-stage failures. Confirm first launch and background/unlock recovery on
the next candidate. The reported installed failure has no stage diagnostic, so
the identified race is a supported cause, not proof that other device-specific
storage failures are absent. No app data reset or weakened file protection is
part of this fix; no build/upload was run for this correction.

### iPhone status-bar safe area — 2026-10-06

The navigation viewport now reserves the top/left/right safe areas for every
route, keeping icons, headings, controls, and scrolled content below the status
bar and away from landscape cutouts. Its background continues through the system
bar in the app theme; status text uses dark icons for the light theme. The
connected terminal no longer adds the same inset a second time, and its keyboard
avoidance accounts for the viewport's top offset.

All 78 JavaScript tests, lint, TypeScript, and formatting passed. Actual iPhone
layout remains pending: inspect the Servers/Welcome icon and headings, scroll a
long screen, rotate, and show/hide the terminal keyboard on the corrected
candidate. No new EAS build or distribution was performed for this layout fix.

### Consolidated fixes preflight — 2026-10-06

After the startup, keyboard, and safe-area fixes, the consolidated workspace
passes 78 JavaScript tests, 23 portable Swift tests, Swift syntax parsing, lint,
TypeScript, formatting, release configuration/vendor/source scanning, and iOS
Metro/Hermes export (1,183 modules; 2.7 MB). Native evidence is in ignored
`native/.build/fixes-security-tests.log`; the bundle is in
`native/.build/fixes-ios-export`. These checks include completed task 10 changes
but do not validate StoreKit against Apple's SDK or configured products.

EAS read-only status confirms build 4 remains the latest finished candidate; no
replacement is already running. A replacement upload was blocked before execution
by automatic approval review because explicit authorization is required to send
the private working-tree source to EAS. No new build or upload occurred. Prior
build 4 source/evidence files were preserved under ignored
`.release/build4-before-fixes`. The next step requires owner authorization for
one consolidated replacement candidate containing these fixes and task 10.

### Authorized replacement build 5 — 2026-10-06

The owner explicitly authorized building and publishing the consolidated version
for tests. EAS build `efd56083-687f-4b18-84c3-c07fb5d15998` (0.1.0 build 5)
failed Apple compilation: three type annotations in `TermforgeAccessService.swift`
used ambiguous `Transaction` names exported by both StoreKit and SwiftUI through
Expo. The full Xcode log reports these three compiler errors. All six transaction
references now explicitly use `StoreKit.Transaction`. All 78 JavaScript tests and
Swift syntax parsing still pass. Failed-build logs and its source snapshot are
preserved under ignored `.release`; build 5 was not submitted to TestFlight.
This diagnosed correction is included in the replacement attempt.

### Protected-key and navigation replacement — 2026-10-07

The owner authorized a new build and TestFlight publication after the protected
data failure recurred upon key creation. This candidate removes the unused
non-interactive key inventory from the startup gate and shares the cancellable
authentication context between installation-association checks and private-key
reads. Existing Keychain access controls remain unchanged. It also contains the
safe-area banner fix, persistent navigation Back button, server-form key refresh,
public-key copy confirmation and user-facing key-protection explanation.

All 82 JavaScript tests, lint, TypeScript, formatting, vendor/configuration checks
and the bounded source secret scan pass. The source scan required unrestricted
Git subprocess access after a sandbox `EPERM`; the check itself then passed.
Expo iOS prebuild and production Metro/Hermes export pass (1,184 modules, 2.7 MB).
Both edited native files pass Swift 6.2 syntax parsing. Unchanged portable native
test evidence is reused; Linux cannot execute Keychain or LocalAuthentication.
The advisory refresh and exposure assessment are recorded in
[dependency security review](dependency-security-review.md).

Before dispatch, EAS reports build 6 finished and Apple reports it `VALID` and
`IN_BETA_TESTING`; no current-source candidate is already running. The production
profile remains store/Release with remote build numbering, existing frozen
credentials and the same encryption declaration. Source identity, build outcome
and TestFlight availability will be recorded after the single replacement runs.
Physical update/relaunch with an existing key, authentication/cancellation,
safe-area/navigation and clipboard feedback remain pending on that candidate.

## Authentication foreground transition and server navigation

The connection now waits for UIKit to become active after a successful native
credential prompt, then rechecks the app-lock revision, live session and host
trust before sending the credential. Backgrounding, locking and cancellation
still invalidate the attempt. Encrypted-key passphrase prompts use the same
foreground wait. Keychain reads for connections explicitly run off the main
actor.

Validation: 87 JavaScript tests pass, including native lifecycle wiring checks;
TypeScript, ESLint and Swift 6.2 syntax parsing of all four changed native files
pass. Wiring checks are not an iOS runtime test. Apple compilation and the
following device checks remain required on a rebuilt app:

- Connect with generated, imported unencrypted and passphrase-encrypted keys;
  finish Face ID or device-passcode authentication and verify a usable shell.
- Cancel authentication, background during authentication, and lock/unlock;
  verify no cancelled credential is sent and a fresh connection can succeed.
- Create a server draft, enter its fields, choose Key, then select a saved key.
  Repeat with + Add key using both generate and import; verify automatic return,
  new-key selection and preservation of every server field. Cancel key creation
  and verify the draft is preserved.
- On a small iPhone and with larger text, reach every navigation button from
  Your servers and verify matching headers and back/home navigation.

## User-path audit — 2026-10-07

Source-level route checks confirm that every app screen has a home-menu or
purchase-information entry point. Reviewed paths include server creation/edit/
duplication, key selection and create/import-return, workspaces and pane
connections, snippets, known hosts, history, settings, import/export, purchase
information, terminal tools, SFTP, cancellation and reconnect. This is not a
physical-device tap-through or a guarantee of layout at every text size.

Fixed during this audit:

- Server edits now honor removing/replacing a jump host; duplicates preserve it.
- Saving a key-authenticated profile requires an existing selected key. Jump
  graphs reject missing hosts and unsupported key-authenticated hops.
- List screens reload on focus after changes elsewhere.
- Failed/closed connections clear consumed identity reviews and return to a
  retryable form. The terminal is shown only when its PTY reports ready.
- Leaving a direct terminal closes its session. Leaving a pending workspace
  connection cancels authentication; completed workspace sessions remain in their
  panes. Late session creation after leaving is cleaned up too.
- Direct connection defaults use port 22 and an explicit username. SFTP starts
  at `/`, not the development fixture's `/home/termforge` directory.

Validation: 91 JavaScript tests pass and 23 portable Swift tests pass in an
offline container, including actual loopback SSH, deferred authentication,
bastion transport and encrypted/unencrypted Ed25519 import. These native tests do
not execute UIKit, iOS Keychain, Face ID, the Expo bridge or a full interactive
PTY session on the user's iPhone. The earlier device matrix still applies.

Remaining audit limitation: server-specific timeout, keepalive, reconnect,
terminal type and startup-command fields are saved but are not passed through by
the terminal route. The native connection currently uses its built-in timeout,
pre-authentication retries and xterm-256color defaults. A successful normal
connection does not verify those advanced profile options. Full iPhone connection
acceptance remains pending on a rebuilt app; no new build was dispatched here.
