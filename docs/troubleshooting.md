# Troubleshooting validation

## SQLite integration tests fail before opening the database

Check the runtime and native-module ABI:

```sh
node --version
npm rebuild better-sqlite3
npm test -- tests/sqlite.integration.test.ts
```

Use the supported Node 22.23.1+ runtime. A message such as `NODE_MODULE_VERSION
137 ... requires NODE_MODULE_VERSION 115` means the installed native module was
built for Node 22 while the current process is Node 20 (or vice versa); switch
Node versions and reinstall or rebuild dependencies before interpreting the
SQLite tests.

Task 06 reran the suite with the already installed Node 24.4.1 runtime, whose
ABI matches the installed `better-sqlite3` binary; both real-SQLite tests pass.
Node 20 remains unsupported for this checkout.

## Native checks are pending on Linux

Linux can validate TypeScript contracts, controllers, fixture protocols, and
real SQLite behavior when the runtime matches. It cannot prove Swift/UIKit,
Keychain, biometric prompts, iOS backgrounding, rendering responsiveness, or
physical keyboard/touch behavior. Record those as pending with the candidate
build ID, device model, OS, and observed result once task 08 runs them.

The changed native bridge now uses per-operation transfer cancellation and
generation/sequence event metadata. An older development client does not
implement that contract and is not compatible evidence for these changes; use
the single task 08 candidate rather than retrying against an older binary.

## Disposable SSH fixtures

Use `npm run` equivalents of the documented fixture scripts in
`docs/development.md`. Generated credentials belong under the ignored fixture
directory and must never be committed. Restarting the fixture intentionally
changes host fingerprints so changed-host-key handling can be exercised.

## Release checks and cloud access

Use `npm run release:check`. Node 24.4.1 is installed on this host; prepend
`/home/aglazer/.nvm/versions/node/v24.4.1/bin` to `PATH` when the shell selects
unsupported Node 20. `npm ci` may need network and a compiler for better-sqlite3.
The Git-reading release scripts need child-process access; an `EPERM` from
`spawnSync git` is a workstation restriction, not a failed source assertion.
Run them in an authorized environment that permits Git child processes.

If EAS reports `EAI_AGAIN api.expo.dev`, check DNS/network access before changing
credentials or spending a build attempt. `eas whoami` and `eas config --platform
ios --profile production` are read-only connectivity checks. An authenticated
Expo account does not prove Apple signing, upload credentials or tester access.
A CLI update notice alone is not a reason to create another build.

`npm run submit:testflight -- EXACT_EAS_BUILD_ID` deliberately rejects missing or
invalid IDs and an unset numeric `submit.production.ios.ascAppId`. Obtain that ID
from the existing App Store Connect app; keep API keys in EAS credential storage.
Inspect the selected finished candidate and verify its encryption declaration
against the existing processed Apple build before upload. Never fall back to `--latest` or create an extra build to upload it.

On a cloud failure, save the build ID and inspect its Apple compile/archive logs.
Resolve all identified causes and rerun affected local checks before a documented
replacement under [tasks/README.md](../tasks/README.md). No automatic retries.
If the acknowledgement hook fails, check installed npm packages and the generated
`ios/Pods/Target Support Files/Pods-Termforge/Pods-Termforge-acknowledgements.markdown`.
Do not bypass missing archive notices or native provenance checks to get a green build.

## Protected data fails to open on an unlocked device

The older “Unlock the device and reopen Termforge” startup message also covered
non-lock errors. A confirmed startup race allowed initialization before the app
became active and prevented retry on the unchanged lock revision. The corrected
startup gate waits for foreground and supplies a Retry button with a safe
`Startup check` stage. This change must reach the installed app before Retry is
available. Developer Mode does not resolve this application lifecycle defect.

Keep the app in the foreground and use Retry on a corrected build. If it still
fails, report the startup-check label, installed app/build number, iOS version,
and whether this was a fresh install or an update. Do not send keys, passwords,
or database contents. Do not delete/reinstall the app as a troubleshooting step:
that can remove local metadata and drafts. Device verification remains pending;
file protection and the app lock are intentionally retained.

### Failure returns after creating an SSH key

The saved-key startup check used a non-interactive Keychain query and discarded
its result. If a protected item returned `KEY_LOCKED`, that failure blocked the
entire app; Retry repeated the same query. Reinstalling removed the metadata
references, temporarily avoiding the query until another key was created.

Startup now opens protected metadata, retries pending key deletions, and applies
auto-lock settings without requiring a key inventory read. SSH keys displays
locked keys and keeps saved entries visible if unlinked-key discovery fails.
When connecting, the installation-association check now shares the tracked,
cancellable authentication context with the private-key read so that Face ID or
passcode authentication can proceed. Keychain access controls, installation
association, and app locking remain enforced; no reset or protection downgrade
is performed.

Regression tests reproduce the startup failure with a `KEY_LOCKED` inventory
response and verify launch/resume, deletion recovery, and metadata failures.
Apple compilation and device verification remain pending for the next authorized
candidate: update the affected installation without reinstalling, launch with
the saved key, background/unlock/reopen, then connect and verify authentication
success and cancellation. No replacement build was requested for this fix.

### Key reports locked immediately after successful authentication

LocalAuthentication can complete before UIKit reports the app as active. The
post-authentication host-trust check previously rejected that temporary inactive
state as `KEY_LOCKED`. It now waits briefly for foreground readiness and then
revalidates the session, lock revision and host trust. Encrypted keys also wait
before presenting their separate passphrase prompt. Actual backgrounding or
locking still cancels the connection. This native change requires a rebuilt iOS
app; a JavaScript-only update cannot apply it. Device verification is pending.

### Remembered trust repeatedly prompts or fails before Face ID

Repeated “Trust and connect” used to update `approved_at` even for an identical
saved key. The native challenge snapshots that approval record during inspection,
so the app's own timestamp update invalidated the challenge before credentials
were requested. “Connect once” avoided the update, explaining why it worked.

Identical saves now preserve the complete approval record. Connect checks saved
trust and skips the question when the target and any jump host match; remembering
an unknown host saves only missing identities. The first-use choices are now
“Trust and remember” and “Connect without saving.” Genuine key changes, removed
trust and expired challenges remain blocked. Existing saved identities require
no reset. A real SQLite regression reproduces the old timestamp mismatch and
verifies persistence across reopening and repeat approval without record changes.
