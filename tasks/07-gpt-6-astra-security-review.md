# 07 — GPT-6 Astra: architecture and security acceptance

Prerequisite: task 06 complete. Read implementation decisions, security documentation, and test/device evidence. Execute only this file; focus on high-risk design and difficult defects.

- Review actual code paths for credentials/Keychain, biometrics, host trust/mismatch handling, SSH authentication, forwarding/bastions, remote escape sequences, clipboard, SFTP local-path boundaries, import/export, backups, and production diagnostics.
- Review session ownership, concurrency, suspension, terminal rendering boundaries, and dependency choices against the approved architecture. Verify no backend/account requirement or production mock can bypass real functionality.
- Fix architecture/security defects and add targeted regression coverage. Re-run affected suites and EAS native/device verification for native changes; verify the signed candidate through TestFlight.
- Reconcile claimed capabilities with real evidence for `instructions.md` §§85–88 and 100. Identify unsupported modes and outstanding manual requirements explicitly.
- Update `docs/security.md` with a concise review result, residual limitations, and release blockers.

Done: no unresolved blocking architecture/security defects; relevant checks pass. Record completion/blockers here. Do not declare production readiness if signed-build, device, or TestFlight evidence is missing.
