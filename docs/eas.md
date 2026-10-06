# EAS and TestFlight workflow

Follow [tasks/README.md](../tasks/README.md): complete local work first, then one
consolidated signed production candidate. EAS works from Linux; local Xcode is
optional. CI never builds or submits automatically.

## Configuration and owner inputs

Existing app identity: owner `adrianglazer`, project
`319c0c22-e047-4fdb-9d44-d841bb7d6a8a`, bundle ID `com.adrianglazer.termforge`.
These are public identifiers, not credentials. Confirm the same bundle ID and
team in Apple Developer and the existing App Store Connect app.

`eas.json` uses remote build numbers and production `autoIncrement` so a candidate
can be uploaded after earlier build 1. All profiles inherit Node 24.4.1 and the
explicit `macos-tahoe-26.5-xcode-26.6` image (SDK 57's documented image on
2026-10-06). It supplies newer-than-Swift-6.2 Apple tooling; actual compilation
and resolution still need the candidate. Development is an internal native
client, preview an internal release binary, production a device/store Release
binary with no dev client. `submit.production.ios.ascAppId` is `6818173928`, the existing app Apple ID
verified through authenticated App Store Connect status. The upload script
requires that numeric ID to avoid creating an accidental app.

Required owner-managed access:

- EAS CLI 22.4.0+ and authenticated Expo project access (`eas whoami`).
- Paid Apple Developer team with valid distribution certificate and App Store
  provisioning profile stored in EAS. Candidate builds freeze existing credentials.
- App Store Connect app access, its numeric Apple ID, and an EAS-managed App Store
  Connect API key with upload rights. `eas credentials --platform ios` manages this
  interactively; credentials are never committed.
- An internal TestFlight tester and physical iPhone running supported iOS.
  UDID registration/Developer Mode applies to internal development builds, not TestFlight.
- Existing encryption/export-compliance declaration. App Store Connect reports
  processed TestFlight build 1 with `usesNonExemptEncryption=false`, matching
  `ITSAppUsesNonExemptEncryption=false` in the source. Preserve that existing
  declaration for this candidate; no new cryptography policy is introduced.
  The owner must review its continued accuracy before public release, especially
  if changing algorithms, bundled cryptography or distribution regions.

Store API keys, Expo tokens, `.p8` files, certificates, provisioning profiles and
app-specific passwords in EAS or private secret storage, outside the source tree.
The ignored `.release/` directory contains local evidence and must not be uploaded
or committed. An Expo login is not proof of Apple or submission credentials.

## Local preflight and single candidate

```sh
npm ci
npm run release:check
npx expo prebuild --platform ios --no-install
node scripts/verify-native-security.js
npx expo export --platform ios --output-dir /tmp/termforge-ios-export
npm run release:source
```

Prebuild/export do not spend the EAS build budget. Reuse unchanged task 07 native
checks, and rerun affected portable tests if native implementation changes.
Review changed native code, exact pins/module wiring and advisory triage together.
For online profile evaluation, `eas config --platform ios --profile production`;
repeat with `development`/`preview` when their configuration changes.

Before creating a job, verify no compatible candidate already exists with
`eas build:list --platform ios --build-profile production --limit 3`. Then:

```sh
npm run build:candidate
```

The command verifies source boundaries, records HEAD, a binary dirty-tree patch
and hashes of tracked **and untracked nonignored files** in `.release/source.json`,
then creates one production job without auto-submit or retries. It preserves the
working tree. The full source SHA-256 is attached to the build message, and job
JSON is saved in `.release/candidate.json`. Retain this evidence privately; copy
build ID/URL, source identity, image and build number to the release record.
Keep the tree unchanged while packaging. Git HEAD alone is insufficient here.

```sh
eas build:view EXACT_EAS_BUILD_ID --json
```

Wait for `FINISHED` and inspect logs before counting compilation as passed.
Inspect failures before any replacement; batch every identified compiler issue,
rerun affected checks, record why replacement is necessary. Never blind-retry.

The local Citadel and Swift Crypto snapshots retain their reviewed versions; Swift
Crypto has a manifest-only C-product patch so Apple builds can use BoringSSL
without restoring `_CryptoExtras`. The ten remote pins and two local baseline
revisions are independently hash-verified.

The pre-install hook checks vendored provenance before bypassing Xcode's package
plugin trust dialog on the headless worker. The config plugin adds
`TermforgeAcknowledgements.txt` as an app resource; post-install refreshes it with
npm-supplied texts, native notices and CocoaPods acknowledgements. Missing npm
notice texts are listed explicitly and need license review. Verify the final IPA
includes this resource, the reviewed native graph and no `_CryptoExtras` link
objects. Source/resource wiring alone cannot establish archive contents.

## Upload the same artifact and accept it

After a finished-candidate inspection and verifying the configured App Store
Connect app and existing encryption declaration:

```sh
npm run submit:testflight -- EXACT_EAS_BUILD_ID
```

The script requires an exact ID rather than selecting `--latest`; submission
uploads the existing artifact without another build. Record submission ID/result,
App Store Connect processing/build number, tester access and observed results.
Read status without scheduling another upload:

```sh
eas submit:view EXACT_SUBMISSION_ID --json
eas submit:status --platform ios --profile production --json --non-interactive
```

`IN_QUEUE` is not an upload failure or proof of Apple acceptance. Retain the
existing job; confirm the current build number is processed before counting
TestFlight availability. Add the processed build to the existing internal testing
group in App Store Connect. Do not invent testers or send invitations without authorization.

Use the same candidate and one physical iPhone for the compact checklist in
[release-checklist.md](release-checklist.md). TestFlight signed distribution is
part of that session. Do not repeat unchanged task 03 acceptance matrices.
iPad/external keyboard/additional OS combinations are optional. When access or a
physical tester is unavailable, record the exact missing input and keep acceptance
pending. EAS submission does not submit a version for public App Review; that
remains a deliberate owner action after every release gate passes.

Official references, checked 2026-10-06:
[EAS schema](https://docs.expo.dev/eas/json/),
[server images](https://docs.expo.dev/build-reference/infrastructure/),
[iOS build lifecycle](https://docs.expo.dev/build-reference/ios-builds/),
[iOS upload](https://docs.expo.dev/submit/ios/),
[internal distribution](https://docs.expo.dev/build/internal-distribution/),
[Apple export compliance](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/).
