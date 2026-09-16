# Security model

Status: architecture decision, 2026-09-15; implementation/security acceptance pending tasks 03, 06 and 07.

## Boundaries

Protect credentials, terminal/file contents, server identities, and user-controlled local files against hostile servers, network interception, accidental logging/export, malicious imported configuration, and casual device access. A compromised OS or malicious application binary is outside the protection claim. No account, proprietary backend, telemetry, remote logging, or terminal-content upload is required.

SSH encryption authenticates the transport only when host-key checking succeeds. Native code enforces trust, credential access, output restrictions, and filesystem capabilities; a React confirmation alone is not an enforcement boundary. Detailed flows: `ssh.md` and `terminal-engine.md`.

## Credentials and lock policy

- Store private keys/passwords/retained passphrases in app-scoped Keychain items using `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`, no synchronization or shared access group. Require a device passcode for stored credentials; metadata/demo screens can still open without one.
- Default protected use requires `userPresence` (biometry or device passcode). An optional strict `biometryCurrentSet` policy must explain that enrollment changes invalidate access. Never silently downgrade protection after failure.
- Native generation, document import, secure text entry, parsing, authentication and deletion return only opaque references plus public metadata to JS. No `retrieveSecret()` bridge. Public-key copy/export is explicit. Imported encrypted keys retain their encrypted representation; passphrases are remembered only by opt-in in a separate protected item.
- Keep decrypted material only for the operation that needs it, release promptly and zero mutable buffers where feasible. Swift/C/library copies prevent a guarantee of perfect memory erasure. Do not claim Secure Enclave-backed Ed25519 keys.
- Backgrounding immediately masks app-switcher content, revokes unlock contexts, cancels prompts and initiates session teardown. Foreground idle auto-lock defaults to five minutes without user interaction. Remote output does not extend unlock time.
- Key deletion closes dependent sessions and removes native items before clearing references. Use a recoverable pending-deletion record because SQLite and Keychain are not one transaction. Reconcile orphan references on startup; missing keys require re-import, never fallback credentials.
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
