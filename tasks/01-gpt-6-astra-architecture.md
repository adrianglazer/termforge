# 01 — GPT-6 Astra: architecture

Read `README.md`, `TASKS.md`, `instructions.md`, and `docs/implementation-plan.md`. Execute only this file. Files in `tasks/` run in numerical order; repeated models handle later dependencies. Preserve existing work. Keep documentation and handoffs concise.

- Inspect repository, tooling, native directories, dependencies, and EAS configuration.
- Research current official documentation. Select compatible Expo/React Native/TypeScript versions, navigation, state management, SQLite, terminal emulator, SSH/SFTP libraries, and Keychain integration. Record versions, licenses, maintenance, alternatives, and compatibility evidence. Do not invent native APIs or implement cryptography.
- Define module contracts, native terminal data flow, session ownership, event/error types, persistence schemas, migrations, recursive pane tree, and opaque credential references. Keep terminal buffers outside React state.
- Define host trust, authentication, biometric/auto-lock, safe OSC/paste, SFTP path handling, forwarding/jump-host, redaction, and suspension policies. Distinguish mandatory capabilities from library-dependent features.
- Specify minimum iOS/device targets, EAS cloud-build/TestFlight workflow, and backup policy; record unresolved owner/signing choices without inventing credentials. Local Xcode must not be a prerequisite.
- Create `docs/architecture.md`, `docs/terminal-engine.md`, `docs/ssh.md`, and `docs/security.md`. Describe the minimal physical-device proof required in task 03 before feature UI starts. Separate researched choices from device-verified results.

Done: implementable contracts and security decisions cover the product requirements; task 02 can scaffold without making fundamental architecture decisions. Update this file with a short completion/blocker note. Do not implement the application.

## Result — 2026-09-15

Complete: `docs/architecture.md`, `docs/terminal-engine.md`, `docs/ssh.md`, and `docs/security.md` define the selected stack, contracts, persistence, security policies, and task 03 device gate. No application code added.

Task 02 may start with Node upgrade (installed 20.6.1 is too old), Expo 57 / RN 0.86.3, iOS 17+. SwiftTerm 1.19.0 and Citadel 0.12.1 remain subject to native packaging, dependency/fork audit, and physical-device proof. Generated-key encrypted export is unsupported; encrypted-key import is required. EAS/Apple signing ownership and registered physical-iPhone access remain prerequisites for task 03, not completed checks; local Xcode is optional. iPad testing is optional and non-blocking.
