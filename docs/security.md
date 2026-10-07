# Security model

Status: task 07 code review/remediation complete 2026-10-06. Signed-iOS security and release acceptance remain pending for the consolidated task 08 candidate.

## Boundaries

Protect credentials, terminal/file contents, server identities, and user-controlled local files against hostile servers, network interception, accidental logging/export, malicious imported configuration, and casual device access. A compromised OS or malicious application binary is outside the protection claim. No account, proprietary backend, telemetry, remote logging, or terminal-content upload is required.

SSH encryption authenticates the transport only when host-key checking succeeds. Native code enforces trust, credential access, output restrictions, and filesystem capabilities; a React confirmation alone is not an enforcement boundary. Detailed flows: `ssh.md` and `terminal-engine.md`.

## Credentials and lock policy

User-facing explanation: [How Termforge protects SSH keys](key-protection.md).

- Store private SSH keys in app-scoped Keychain items using `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`, no synchronization or shared access group. Require a device passcode for stored keys; metadata/demo screens can still open without one. SSH passwords and imported-key passphrases are requested through native prompts and are not saved by the current implementation.
- Default protected use requires `userPresence` (biometry or device passcode). An optional strict `biometryCurrentSet` policy must explain that enrollment changes invalidate access. Never silently downgrade protection after failure.
- Native generation, document import, secure text entry, parsing, authentication and deletion return only opaque references plus public metadata to JS. No `retrieveSecret()` bridge. Public-key copy/export is explicit. Imported encrypted keys retain their encrypted representation; remembering passphrases is unavailable.
- Keep decrypted material only for the operation that needs it, release promptly and zero mutable buffers where feasible. Swift/C/library copies prevent a guarantee of perfect memory erasure. Do not claim Secure Enclave-backed Ed25519 keys.
- Backgrounding immediately masks app-switcher content, revokes unlock contexts, cancels prompts and initiates session teardown. Foreground idle auto-lock defaults to five minutes without user interaction. Remote output does not extend unlock time.
- Key deletion closes dependent sessions and removes native items before clearing references. Use a recoverable pending-deletion record because SQLite and Keychain are not one transaction. Retry pending deletions on startup; inspect key inventory in SSH keys. A non-interactive inventory failure must not prevent access to local metadata. Private-key use checks installation association with the same cancellable authentication context used to read the protected key. Missing keys require re-import, never fallback credentials.
- Removing the device passcode or restoring to a new device can make credentials unavailable. Reinstallation must not silently reconnect using leftover Keychain entries; a fresh installation requires explicit credential reassociation or removal.

Apple references: [passcode/device-only accessibility](https://developer.apple.com/documentation/security/ksecattraccessiblewhenpasscodesetthisdeviceonly), [user presence](https://developer.apple.com/documentation/security/secaccesscontrolcreateflags/userpresence), [biometric enrollment binding](https://developer.apple.com/documentation/security/secaccesscontrolcreateflags/biometrycurrentset).

## Storage, backup, and diagnostics

- SQLite holds non-secret metadata, but hostnames, snippets and labels may still be sensitive. Use iOS file protection for database, WAL/SHM, downloaded files and editor drafts; close storage before protected data becomes unavailable.
- No terminal transcripts or command history are persisted. Do not encourage storing passwords inside snippets/startup commands/environment; credential fields and native prompts are the supported secret path.
- No iCloud sync entitlement. Put private metadata/downloads in a protected app-private directory marked excluded from backup; reapply exclusion after replacement. Explain that users need explicit configuration export and their original keys for recovery. Backup exclusion is system guidance, **not a guarantee**; credentials remain outside SQLite regardless.
- User-selected exports/downloads may leave the sandbox by explicit action. Export uses an allowlist and a content review; arbitrary user-authored snippet text cannot be guaranteed secret-free by a scanner.
- Production logs contain allowlisted event/error codes, operation IDs and timings only. No raw errors, hostnames, key material, auth tokens, clipboard text, commands, terminal output, file bodies, or full paths. Disable/redact dependency loggers too. Never attach application stores or native buffers to crash reports.
- Use temporary protected files for editor/transfer work, remove completed/discarded temporary content, and clean stale files after crashes. Do not claim secure erasure of flash storage.

References: [Apple backup guidance](https://developer.apple.com/documentation/foundation/optimizing-your-app-s-data-for-icloud-backup), [bounded background execution](https://developer.apple.com/documentation/uikit/extending-your-app-s-background-execution-time).

## Required verification

| Boundary     | Acceptance evidence                                                                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host trust   | Unknown-key approve/reject; mismatch blocks before auth; stale approvals and concurrent changes cannot bypass checking; every bastion verified                          |
| Credentials  | Wrong passphrase, cancellation, locked/no-passcode device, enrollment change, missing/deleted key, relaunch/reinstall; bridge/log/export inspection contains no secrets |
| Remote input | Bounded escape sequences, OSC clipboard/URLs, large output, long Unicode lines, parser fuzzing; no local side effects                                                   |
| File access  | Traversal, symlink escape, malformed filenames, stale picker handles, interrupted transfers, editor conflicts; no unrelated local file access                           |
| Lifecycle    | Reconnect limits, rapid network loss, background/lock teardown, cancellation races, old-generation events, independent concurrent sessions                              |
| Supply chain | Exact native/JS lockfiles, license notices and bundled-source audit; review Citadel's NIOSSH fork, key parser force unwraps/KDF bounds, and native backpressure         |

Generated-key encryption beyond Keychain protection remains unsupported by the selected Citadel writer; do not advertise a generated-key passphrase feature. Imported encrypted-key authentication is mandatory. Any newly discovered blocker reopens the relevant architecture decision; tests must not be weakened to conceal it.

Task 01 has performed documentation/source review only. No security test, credential round-trip, performance benchmark, signed build, or physical-device acceptance is marked passed.

Task 03 fixture update (2026-09-16): generated client credentials and passwords
live only in the ignored `tests/ssh-server/generated/` directory, which is also
excluded from the Docker build context. Container host keys use disposable
volumes. Host-side public-key authentication, SFTP, high output, bastion access,
and local forwarding were exercised. This is fixture validation only; native
trust enforcement, Keychain isolation, encrypted-key use, mismatch handling,
path boundaries, suspension, and all physical-device security checks remain
unverified because the required Apple build/device environment was unavailable.

Task 06 source hardening (2026-10-05): remote OSC clipboard access is disabled;
session events are generation/sequence ordered; transfer cancellation is
operation-scoped; app-local upload URLs are checked after symlink resolution;
download temporaries are protected and excluded from backup; editor replacement
has rollback protection; raw SFTP/server errors are not retained in JS-facing
records; and password fields are cleared after a connection attempt is handed
to native code. The exact native package pins are unchanged and license duties
are inventoried in `docs/dependency-licenses.md`.

This is source/local-test evidence, not a Swift compilation or physical-device
claim. Native compiler/runtime validation stays in the shared task 08 candidate.
The broader credential-entry boundary and final supply-chain/security approval
remain task 07 Astra review items rather than being redefined here.

## Task 07 review — 2026-10-06

Review scope: credentials, host trust, lifecycle, terminal output, forwarding,
SFTP capabilities, configuration, diagnostics and dependency reachability. The
October 5 first pass identified SEC-01–06; the continuation implements the
remediation below. Final local validation is recorded in task 07. This is code
review and local evidence, not signed-iOS or production acceptance.

### Findings and implementation

| Finding                          | Remediation and boundary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC-01: lock/storage lifecycle   | Native five-minute idle lock (settings: 1–30 minutes), passive user-activity observation, inactive privacy covers, background/protected-data teardown and device-owner authentication for unlock. Remote output does not reset idle time. Locked React screens unmount; storage stops accepting opens, drains initialization, closes and reopens after unlock. SQLite/sidecars, staging and installation metadata use complete protection and backup exclusion. OS notification timing and actual file protection remain candidate checks.                                                         |
| SEC-02: trust/auth ordering      | Native one-use UUID challenges expire after 120 seconds and bind canonical endpoint, inspected key, saved identity/record snapshot and lock revision. Consumption binds the session and generation. Actual SSH host validation precedes native secret acquisition; saved trust and ownership are checked again before releasing the authentication offer. Changed algorithms/keys fail closed; trust replacement is a separate removal action. No secret offer is retained in Citadel's reconnect provider, and automatic retries stop after credentials are requested.                            |
| SEC-03: credential lifecycle     | Passwords/passphrases and imported key bytes stay native. Keychain uses passcode-required, device-only, nonsynchronizing access. Imports retain their OpenSSH envelope. A durable SQLite deletion journal hides pending keys and replays deletion on unlock/startup. A backup-excluded installation marker prevents silent reuse of old Keychain entries. Missing/reassociation states and explicit unlinked-item cleanup are exposed in Keys. Deletion closes dependent sessions and active credential prompts.                                                                                   |
| SEC-04: local file authority     | Native document selection returns opaque handles, not paths. Import/upload consumes a kind-specific handle once; downloads expose only a native-issued export handle. Coordinated reads reject symlinks/nonregular descriptors, use `O_NOFOLLOW`, verify `fstat`, bound bytes and recheck cancellation. Protected staging has eight published handles, two concurrent copies, ten-minute expiry, explicit discard, lock revocation and crash cleanup. Only legacy app-created picker caches and UUID-named download temporaries are removed.                                                       |
| SEC-05: remote output/resources  | The actual SwiftTerm feed now passes through a streaming native admission gate: complete OSC ≤4096 bytes, CSI ≤256, parameters ≤4096/count ≤24. Graphics/DCS/APC/PM/SOS, remote clipboard, hyperlinks and window manipulation are disabled. Native tests cover chunk boundaries, huge/incomplete control strings, C1 controls and UTF-8. Forwards use manual reads/writability backpressure, four forwards/session and sixteen accepted connections/forward; stop/lock owns listeners, accepted channels and pending transports. Reverse SSH data frames are converted explicitly to byte buffers. |
| SEC-06: dependencies/diagnostics | Eleven remote revisions are recorded in `native/Package.resolved`; Xcode receives exact requirements plus the workspace lock. Citadel is the documented local 0.12.1 patch under `native/Vendor/Citadel`. SwiftLog uses a no-op sink, SwiftTerm input debugging/logging is disabled, and app diagnostics retain only allowlisted event codes/numbers. Notices and advisory reachability are recorded separately; no clean-audit claim is made.                                                                                                                                                     |

Additional input boundaries: at most eight sessions and eight transfers; queued
terminal input ≤64 KiB and individual input ≤16 KiB; transfers ≤256 MiB against
actual bytes; editor reads/conflict hashing ≤2 MiB. Zero-progress/oversized SFTP
responses reject. Upload cancellation is checked before rename; edits preserve
existing rollback behavior. Native sockets are owned before authentication,
including failed or cancelled handshakes. A remote-forward cancellation that
receives no acknowledgement closes its session after five seconds.

Configuration import/export rebuilds nested allowlists and validates types,
identities/references, jump cycles, layouts and UTF-8 size (1 MiB). Imports use an
exclusive transaction. Key references, trust records, startup/environment and
runtime extras cannot be injected/exported through that path. Snippet commands
and public metadata remain user content and can contain manually entered secrets;
exports require review. No scanner promises arbitrary snippets are secret-free.

### Dependency findings and maintained patch

Citadel's hard-coded ten-second login deadline conflicted with secure entry after
host verification. The local patch exposes `loginTimeout`; the app permits 150
seconds while secure alerts expire after 120. The portable real-SSH test waits
11 seconds before offering credentials. The public async existing-channel API
also used synchronous NIO operations from an arbitrary executor; a reproduced
precondition crash is fixed by dispatching setup to the channel event loop.
Transport reads stay paused until SSH handlers are installed. The exact patch,
upstream revision, license and file hashes are retained, with
`scripts/verify-native-security.js` checking them and generated Xcode wiring.

The reviewed NIOSSH fork defaults to Curve25519/P256/P384/P521 ECDH, Ed25519/ECDSA
host keys and AES-128/256-GCM. The application does not register Citadel's
`SSHAlgorithms.all`, RSA/SHA-1/DH-group14-SHA1 or CTR transport algorithms. AES-CTR
here is permitted only for imported OpenSSH private-key envelopes, not transport.
Import preflight accepts one Ed25519 key, `none` or AES-128/256-CTR, bcrypt salt
16–64 bytes/rounds 1–100 and a nonempty aligned private block before decryption.
This bounds parser/KDF exposure; it is not a full cryptographic audit.

Current advisory evidence and reachability are in
[dependency security review](dependency-security-review.md). The source-map-js
patch release is installed. Remaining npm findings are isolated build-tool paths
or the bounded external-link decoder path; the Swift Crypto advisory concerns an
unused RSA product removed from the application graph. Keep these restrictions
and repeat advisory triage before release. Do not call the dependency graph
vulnerability-free or upgrade crypto independently of the NIOSSH fork's range.

### Limitations and acceptance reconciliation

Supported credentials are passwords and Ed25519 imports/generation. RSA/ECDSA
private-key import/use, keyboard-interactive/MFA, key-authenticated or multiple
bastion hops, SOCKS, agent/X11 forwarding, private-key export, generated-key
passphrase encryption and remembered passphrases remain unavailable. Imported
encrypted keys prompt on use. Older imports stored only a decrypted seed; the
original encrypted envelope cannot be reconstructed and must be re-imported.
Reassociation is explicit, never an automatic workaround for missing keys.

Bastion inspection is two-stage: verify the bastion before entering its native
password, then inspect the destination through that connection. The final review
displays both identities. Inspection credentials are discarded; connecting asks
again. No direct route to the destination is required by this flow.

| Requirement           | Evidence and remaining release work                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `instructions.md` §85 | Preserve task 03's accepted terminal/SFTP evidence. Changed native auth, input/lifecycle and Files paths need the shared candidate smoke. Full terminal command matrices were not rerun on an iPhone.                                               |
| §86                   | JS stress plus actual native parser/forwarding tests cover bounded input, slow peers, channel ownership and Unicode. They do not establish UIKit rendering speed, four-session device memory or eight-pane performance.                             |
| §87                   | Allowlist/redaction, SQLite trust/deletion recovery, native parser/KDF and real SSH checks are executable local evidence. Keychain/LAContext, privacy-cover timing, Files provider behavior and OS file protection require Apple/device validation. |
| §88                   | Local suites, lint/types/format, source hashes, Expo prebuild and iOS JS export are checked. Xcode compilation, archive notices, signed installation and TestFlight remain pending for task 08. No EAS build or submission was performed.           |
| §100                  | No account, backend, telemetry or production mock fallback was found in reviewed application wiring. Code completion is not production readiness; the consolidated signed candidate remains required.                                               |

Residual physical checks: correct/wrong encrypted passphrases; cancellation during
Face ID/prompt/transfer; no-passcode/enrollment changes; cold launch and lock/unlock;
metadata/sidecar protection; Files providers/export; app-switcher privacy; teardown
of pending handshakes and accepted forward channels; and the compact four-session
workload. Verify the candidate uses the local Citadel package, the lock revisions,
Swift 6.2-compatible tooling and bundled notices. Record source/dirty-patch identity,
build ID, iPhone/OS and results. Swift/library copies prevent a perfect-memory-
erasure guarantee, and generated Ed25519 keys are not Secure Enclave keys.

### Task 08 Apple package-wiring continuation

The first Apple compiler attempt after task 07 exposed a hidden transitive module
requirement: Citadel imports `CCryptoBoringSSL`, while Swift Crypto's `Crypto`
product uses CryptoKit on Apple and omits that C target. `_CryptoExtras` had
previously pulled it in incidentally. The reviewed parser-removal decision is
preserved: Swift Crypto 3.15.1 is now locally vendored at the same upstream
revision, with a manifest-only product exposing its existing C target; Citadel
explicitly depends on it. Cryptographic source and enabled algorithms are unchanged.
`_CryptoExtras` remains absent from the application dependency/link graph.

The new snapshot/manifest patch is in `native/Vendor/swift-crypto`, with upstream
licenses/notices, full file hashes and exact provenance. Ten remote revisions plus
the two local baseline revisions replace the earlier eleven-remote/one-local
layout without changing versions. All 14 portable native tests were rerun and
pass; their link file contains no `_CryptoExtras` objects. Production build 4 subsequently passes actual Apple compilation and archive
inspection, including local-package resolution and absence of `_CryptoExtras`
build/link steps in the full log. See [task 08](../tasks/08-gpt-5.6-luna-release-preparation.md)
for source/artifact identity. Physical Keychain/biometric, lifecycle/privacy,
Files-provider and workload gates remain pending; compilation does not establish
that behavior.
