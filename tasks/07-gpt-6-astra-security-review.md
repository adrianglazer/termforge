# 07 — GPT-6 Astra: architecture and security acceptance

Validation/build policy: follow `tasks/README.md`. It supersedes older per-task device gates, repeated EAS/TestFlight requirements, and conflicting validation cadence in referenced plans. Historical results below remain evidence only.
Prerequisite: task 06 complete. Read implementation decisions, security documentation, and test/device evidence. Execute only this file; focus on high-risk design and difficult defects.

- Review actual code paths for credentials/Keychain, biometrics, host trust/mismatch handling, SSH authentication, forwarding/bastions, remote escape sequences, clipboard, SFTP local-path boundaries, import/export, backups, and production diagnostics.
- Review session ownership, concurrency, suspension, terminal rendering boundaries, and dependency choices against the approved architecture. Verify no backend/account requirement or production mock can bypass real functionality.
- Fix architecture/security defects and add targeted regression coverage. Re-run affected local suites and available native checks. Batch native fixes before the task 08 candidate; carry only iOS-specific residual checks to that milestone.
- Reconcile claimed capabilities with real evidence for `instructions.md` §§85–88 and 100. Identify unsupported modes and outstanding manual requirements explicitly.
- Update `docs/security.md` with a concise review result, residual limitations, and release blockers.

Done: no unresolved blocking architecture/security defects in reviewed code; relevant local checks pass. Code-review completion allows task 08 while shared candidate evidence is pending. Record completion/blockers here. Do not declare production readiness if signed-build, device, or TestFlight evidence is missing.
