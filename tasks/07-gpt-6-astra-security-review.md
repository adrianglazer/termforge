# 07 — GPT-6 Astra: architecture and security acceptance

Validation/build policy: follow `tasks/README.md`. It supersedes older per-task device gates, repeated EAS/TestFlight requirements, and conflicting validation cadence in referenced plans. Historical results below remain evidence only.
Prerequisite: task 06 complete. Read implementation decisions, security documentation, and test/device evidence. Execute only this file; focus on high-risk design and difficult defects.

- Review actual code paths for credentials/Keychain, biometrics, host trust/mismatch handling, SSH authentication, forwarding/bastions, remote escape sequences, clipboard, SFTP local-path boundaries, import/export, backups, and production diagnostics.
- Review session ownership, concurrency, suspension, terminal rendering boundaries, and dependency choices against the approved architecture. Verify no backend/account requirement or production mock can bypass real functionality.
- Fix architecture/security defects and add targeted regression coverage. Re-run affected local suites and available native checks. Batch native fixes before the task 08 candidate; carry only iOS-specific residual checks to that milestone.
- Reconcile claimed capabilities with real evidence for `instructions.md` §§85–88 and 100. Identify unsupported modes and outstanding manual requirements explicitly.
- Update `docs/security.md` with a concise review result, residual limitations, and release blockers.

Done: no unresolved blocking architecture/security defects in reviewed code; relevant local checks pass. Code-review completion allows task 08 while shared candidate evidence is pending. Record completion/blockers here. Do not declare production readiness if signed-build, device, or TestFlight evidence is missing.

## Review record — 2026-10-05–06

**Done: code review, remediation and local acceptance complete.** SEC-01–06
from the first pass are addressed in the reviewed source. Task 08 may prepare
the single consolidated candidate. Signed-iOS security/release acceptance is
still pending; no production-readiness claim is made.

The detailed boundaries, limitations and §85–88/§100 reconciliation are in
[`docs/security.md`](../docs/security.md#task-07-review--2026-10-06).

### Remediation

- Native secure credential prompts, preserved encrypted OpenSSH imports, bounded
  KDF parsing, Keychain installation association, explicit recovery/cleanup and
  a durable pending-deletion journal. No password/private-key/passphrase bridge.
- Native one-use trust challenges and actual peer validation before credential
  access, with saved-trust/session/generation/lock checks. Both bastion and target
  are independently verified; private targets can be inspected through a reviewed
  bastion. Changed trust cannot be silently replaced or downgraded to passwords.
- Native foreground idle lock, privacy covers, device-owner unlock, protected-data
  teardown and coordinated protected SQLite shutdown/reopen.
- Native picker-issued single-use handles, coordinated bounded copies, regular-file
  descriptor checks and temporary-file expiry/lock/crash/legacy-cache cleanup.
- Native output admission before SwiftTerm, disabled remote graphics/clipboard,
  bounded transfer/input queues and forwarding connection ownership/backpressure.
  Pending sockets are owned before authentication; stalled remote-forward
  cancellation closes the session after five seconds.
- Nested import/export allowlists, strict validation, exclusive transactions,
  diagnostic allowlists, native dependency logging suppression and external-link
  admission before the affected permissive router decoder.
- Exact native transitive lock, source hashes/notices and advisory reachability
  review. source-map-js is patched to 1.2.2. Citadel 0.12.1 is locally vendored with
  a documented small patch: configurable login timeout, event-loop-safe setup,
  read resumption and removal of its unused `_CryptoExtras` product dependency.

### Local validation

- Node **24.4.1**, npm (pnpm unavailable): **63 tests pass across 12 files**,
  including real SQLite trust/deletion recovery and metadata lock races.
- Swift **6.2.4**, Linux container: **14 tests pass**. These compile the actual
  admission/preflight, forwarding and owned-transport code against the pinned
  Citadel/NIO graph. Real loopback SSH covers an 11-second deferred credential
  offer, changed-host rejection before credentials and a bastion. Generated
  disposable OpenSSH keys cover plaintext/encrypted import and wrong passphrases.
  Other native tests cover hostile controls, slow peers, caps and channel teardown.
- Lint, TypeScript, formatting and diff whitespace: passed.
- All iOS Swift sources: syntax parse passed. This is not UIKit/Keychain typechecking.
- Expo iOS prebuild, generated local-package/lock/module-scope verification and
  iOS Metro/Hermes export: passed. No Xcode archive or EAS build was requested.
- `scripts/verify-native-security.js`: 47 vendored source/package/license/patch
  hashes, eleven remote pins and generated Xcode wiring verified.
- Advisory queries completed. npm still reports **26 tree entries** (15 high,
  11 moderate; four underlying advisories); OSV matches one Swift Crypto advisory.
  Mitigation/reachability and the intentionally non-clean scanner result are in
  [`docs/dependency-security-review.md`](../docs/dependency-security-review.md).
  They are not silently waived or presented as a zero-vulnerability audit.

The native tests found and fixed an existing-channel event-loop crash and a
nested SSH read-resumption stall. Earlier failures and the original SEC findings
are superseded by the completed remediation and passing evidence above.
Pre-existing task 05/06 and unrelated task files were preserved.

### Shared-candidate release gates

Use the existing task 08 budget: one consolidated candidate, no per-feature build.
Verify actual iOS compilation/package resolution, protected Keychain/biometrics,
secure prompt cancellation, lock/privacy/storage timing, Files providers/export,
authentication and bastion/forwarding integration, then the compact physical
terminal/accessibility/four-session workload. Confirm archive notices and absence
of `_CryptoExtras`, record build/device/source identity, and repeat advisory triage.
No new product-policy waiver, user question, EAS quota use, TestFlight upload or
App Store submission was needed for this task.
