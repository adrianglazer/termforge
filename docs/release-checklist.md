# Release checklist

Local preparation is not production readiness. Follow [tasks/README.md](../tasks/README.md):
one consolidated production candidate after tasks 04–07, one compact physical
session, upload the same artifact. Preserve historical evidence; record pending
items honestly. No public submission is automated.

## Task 10 later-candidate gates

Build 4's evidence remains historical and does not validate new StoreKit code.
The owner reports waiting for distribution; no current status was invented or
new upload scheduled. Batch monetization with other ready native changes in the
next consolidated candidate under `tasks/README.md`.

- [ ] Verify existing IAPs/IDs, zero-price non-consumable 7-day Trial, US $14.99
      lifetime non-consumable/localized prices, Family Sharing off, free app,
      active agreements/tax/banking and In-App Purchase signing capability.
- [ ] Apple-compile the changed access service/Keychain/inline module and inspect
      the signed archive; no access/date override may enter a production build.
- [ ] Run local Xcode StoreKit configuration plus sandbox/TestFlight purchase,
      cancellation/pending/verification error, restore/original date, offline,
      missing price, revocation/update and immediate-unlock acceptance.
- [ ] On the same later candidate, verify foreground expiry/warning closes shell,
      forward and transfer, denies native reconnect/SFTP/snippet/jump work, keeps
      editor/local copy/export/delete accessible and respects existing app lock.
- [ ] Verify clock correction/explicit restore recovery and actual localized
      price/expiration/VoiceOver/purchase-sheet security cover behavior.
- [ ] Use real later-candidate IAP screenshots and attach first non-consumables
      to the applicable new app version only through an owner-authorized review.

Precise implementation, metadata, evidence limits and focused Apple checks:
[monetization](monetization.md). Website has the planned offer; published listing,
legal/contact details and final payment evidence remain pending.

## Before the candidate

- [ ] Record Node/npm/EAS versions; install from `package-lock.json` with `npm ci`.
- [ ] `npm run release:check`: tests, lint, types, format, bounded secret scan,
      native source hashes/configuration and diff whitespace pass.
- [ ] Review tasks 05–07 evidence and every pending native change/known compiler
      issue together. Reuse the 14 task 07 portable native tests where unchanged;
      changed native behavior needs affected tests.
- [ ] Expo iOS prebuild/package/module-scope check and Metro/Hermes export pass.
      They do not establish UIKit/Keychain/Expo Apple compilation.
- [ ] Repeat advisory queries; assess new findings. Preserve reviewed mitigations
      in [dependency-security-review.md](dependency-security-review.md). A nonzero
      audit is documented evidence, not a pass or an automatic waiver.
- [ ] Review license inventory, native notice texts, patched Citadel provenance
      and generated npm notice gaps. Plan final CocoaPods/IPA notice inspection.
- [ ] Confirm app name/version/icon, EAS owner/project, bundle ID and Apple team.
      Preserve `com.adrianglazer.termforge`; no placeholder identity remains.
- [ ] Verify existing EAS distribution signing credentials, remote versioning,
      production/store Release profile and compatible pinned Apple build image.
- [ ] Freeze the source tree during packaging; retain `.release/source.json` and
      `.release/working-tree.patch` privately, including untracked work hashes.
      Record HEAD plus source SHA-256, not just HEAD.

## Signed artifact and TestFlight

- [ ] Confirm no current-source candidate already exists; run `npm run build:candidate`
      once. Record build ID/URL, source SHA, profile, image, app/build version and result.
- [ ] Inspect the completed Apple compile/archive logs and resolved graph; verify
      local Citadel, all reviewed pins, no `_CryptoExtras` linked objects, production
      diagnostics and inline-module registration.
- [ ] Inspect the final IPA for `TermforgeAcknowledgements.txt`, npm/native/CocoaPods
      notice texts, privacy manifests and correct Info.plist/entitlements. Missing
      npm texts listed in the inventory require license review before public release.
- [ ] Verify existing Apple/source encryption declaration: processed build 1 reports
      `usesNonExemptEncryption=false`, matching the source. Preserve it for this
      candidate; require owner review before public release or cryptography changes.
- [ ] Confirm existing App Store Connect app and numeric `ascAppId`, upload API-key
      access, internal tester and beta contact/test information.
- [ ] `npm run submit:testflight -- EXACT_EAS_BUILD_ID`: upload the existing artifact.
      Record submission result and Apple processing/build number. No `--latest`.
- [ ] Install that TestFlight build on one physical iPhone and complete the compact
      acceptance below. Record device/OS and observed results; no second full suite.

A failed build needs log diagnosis and affected local checks before one replacement.
Do not create extra development/preview copies or retry just because quota resets.

## One physical-iPhone session

Only the changed or unverified paths below are pending. Reuse accepted task 03/04
terminal/SFTP evidence; local mocks and Swift syntax parsing cannot resolve these
OS/physical gaps. Combine related checks in one session on the same signed build.

| Check                                                                                                                                                                                                                | Why physical/Apple validation remains necessary                                                                                                                         | Result  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| Signed launch, offline reopen, actual sandbox metadata/sidecars; lock/unlock, idle/background privacy cover, secure prompt cancellation, encrypted Ed25519 correct/wrong passphrase; no-passcode/enrollment handling | Task 07 changed Keychain installation association, native prompts, LAContext, file protection and protected SQLite coordination. Linux cannot execute these Apple APIs. | Pending |
| Files-provider import/upload/download/export with a small checksum-verified fixture; cancellation/lock and temporary-copy cleanup                                                                                    | Task 07 introduced coordinated picker-issued single-use handles and protected copies. JS/controller tests cannot validate provider permissions.                         | Pending |
| Portrait/landscape, keyboard occlusion, compact header/accessory controls, direct/composed Unicode and composer, representative control input, selection/clipboard and one interactive-tool PTY resize               | Tasks 04/06/07 changed header/keyboard/native input/output boundaries. UIKit/touch/IME/rendering require a phone.                                                       | Pending |
| Control Center interruption versus actual background/foreground; one interrupted SSH/transfer recovery                                                                                                               | Tasks 06/07 changed inactivity/background lock and teardown. Actual iOS lifecycle delivery/suspension is absent from Linux tests.                                       | Pending |
| Native host-review-before-credentials with changed-host rejection, password/Ed25519 connect, one password-bastion/private-target path and representative local/remote forward teardown                               | Task 07 changed native trust/auth/pending-socket ownership; portable SSH tests exclude UIKit prompts/Expo wiring. Automate fixture integrity checks.                    | Pending |
| Brief VoiceOver/focus/Dynamic Type smoke and a combined four-session/high-output/resize/transfer workload; record responsiveness and available native memory                                                         | Physical accessibility and UIKit memory/rendering are not established by local stress helpers.                                                                          | Pending |

## Public App Store release (owner action)

- [ ] Every signed/device/security/notice gate above passes or has an explicit
      evidence-based disposition; no unresolved release blocker is called passed.
- [ ] Publish real support/privacy URLs, add the policy link inside the app, and
      verify final archive privacy manifests/required reason APIs and SDK practices.
- [ ] Complete App Privacy, age rating, encryption/export compliance, copyright,
      category, price/regions and any required agreements using accurate owner inputs.
- [ ] Final app name/subtitle/description/keywords match supported features;
      [app-store.md](app-store.md) is a draft, not published material.
- [ ] Real current-candidate screenshots pass privacy and dimension checks.
- [ ] Supply private reviewer contact, disposable SSH host/fingerprint/access and
      reproducible notes. No personal credentials in repository or screenshots.
- [ ] Owner selects the accepted existing build in App Store Connect and explicitly
      submits the version for public review. Record that decision separately.

## Candidate record

Record date, revision, dirty patch/source SHA, EAS build ID/URL, image/profile,
app/build version, compile/archive/notice findings, submission ID/status, Apple
processing, iPhone/OS, device results, unresolved prerequisites and owner sign-off
in task 08. Never paste certificates, tokens, private artifact URLs or credentials.
