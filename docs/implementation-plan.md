# Termforge implementation plan

## Outcome and principles

Deliver an iOS/iPadOS terminal workstation that establishes real SSH sessions, renders an actual terminal emulator, transfers files over SFTP, and protects credentials locally. It will use Expo development builds, not Expo Go. The React Native layer owns presentation and durable user-facing models; Swift Expo Modules own protocol, secret-storage, and performance-sensitive native work.

The product will be offline-capable for saved metadata and will not require a backend, account, analytics, or cloud synchronization. A connection must never be reported as active unless a real native SSH connection exists.

## Architecture boundaries

```text
React Native UI / navigation / state
  -> application services (sessions, workspaces, servers, snippets)
    -> typed native-module interfaces
      -> Swift Expo Modules (terminal renderer, SSH, SFTP, Keychain)
        -> iOS APIs and vetted third-party libraries
```

- Persistent, non-secret data: SQLite with versioned migrations (profiles, key metadata, layouts, settings, snippets, known-host records, history).
- Secrets: Keychain only (private keys, passwords, passphrases where user opts to retain them). Stores hold opaque keychain references, never key material.
- Runtime data: a session manager outside React component lifecycle owns connections, terminal buffers, focus, transfer tasks, and connection state.
- Layouts: a validated recursive split tree (`split` with direction/ratio/children, or terminal leaf), never an arbitrary pane collection.
- Errors: native errors map to typed application error codes and safe user messages; redact credentials and terminal content by default.

## Required discovery gates

Complete these before committing to native implementation details. Record the results and dependency versions/licenses in the referenced documents.

1. Inspect the current Expo SDK, React Native, and Expo Modules APIs; create the project only with mutually compatible versions.
2. Evaluate maintained, permissively licensed iOS terminal renderers/emulators for VT/xterm behavior, Unicode, selection, resize, and high-output performance. Document the decision, rejected alternatives, benchmarks, and accessibility limitations in `docs/terminal-engine.md`.
3. Evaluate mature iOS SSH libraries for modern algorithms, PTY channels, SFTP, forwarding, jump hosts, host-key verification, licensing, and maintenance. Do not implement SSH or cryptography. Document the choice and threat-sensitive integration details in `docs/ssh.md`.
4. Validate chosen libraries in a minimal Expo development build on a physical iPhone and iPad before building feature UI.
5. Check each new dependency for Expo compatibility, maintenance, license, and necessity; pin and document it.

## Delivery phases

### 1. Foundation

Scaffold the Expo/TypeScript project, strict lint/type/test configuration, EAS profiles, app configuration with a clearly replaceable bundle ID, formatting, and a scalable directory structure. Add basic navigation, theme tokens, error/logging contracts, SQLite migration bootstrap, and documentation skeleton.

Exit criteria: clean install, lint, type-check, unit-test command, and development build; no native functionality is claimed yet.

### 2. Domain and persistence

Implement validated TypeScript models and repositories for servers, SSH key metadata, settings, snippets, workspaces, layouts, and non-secret import/export. Add migrations and tests for validation, migration, layout-tree editing, and secret exclusion from exports.

Exit criteria: app opens offline and preserves non-secret data across relaunch; private keys and passwords cannot enter SQLite, logs, or regular state.

### 3. Native-module proof of capability

Create isolated Expo Module contracts for secure storage, terminal rendering/engine, SSH, and SFTP. Build a disposable Docker OpenSSH test server with generated test-only credentials and fixtures. Implement the Keychain module and biometric/auto-lock policy boundary.

Exit criteria: development build connects module events to JavaScript; secure-storage round-trip works only via opaque references; no real secret is committed.

### 4. Terminal engine and terminal UX

Integrate the selected native emulator/renderer with bounded scrollback, resize, ANSI/Unicode handling, alternate buffers, title updates, safe OSC handling, selection/copy/paste, search, themes, and an adaptable terminal keyboard toolbar. Establish terminal model and renderer performance boundaries so React never renders individual terminal cells.

Exit criteria: a locally fed engine passes parser/model tests and remains responsive under 100,000-line and rapid-output fixtures. Document any intentional compatibility limits.

### 5. SSH, trust, and lifecycle

Implement real SSH configuration, authentication via Keychain references, host-key first-use confirmation, mismatch blocking, PTY open/write/resize, typed lifecycle states, timeouts, keepalive, and bounded exponential reconnect. Negotiate `xterm-256color` by default and send current dimensions.

Exit criteria: integration tests against the disposable server cover authentication success/failure, encrypted keys, host-key mismatch, disconnect, timeout, resize, Ctrl keys, Unicode, and large output. The terminal acceptance commands work on a physical device.

### 6. Core workstation UX

Deliver server dashboard and editor, key-management UI, real session manager, terminal tabs, recursive split panes, focus/resize/zoom/duplicate/rename, and persistent workspaces. Keep sessions alive through React rerenders but handle iOS suspension honestly and reconnect when foregrounded.

Exit criteria: multiple concurrent sessions and 4-/8-pane layouts are stable on iPad; restored workspaces recreate configuration without falsely restoring a dead connection.

### 7. Files and remote editing

Implement SFTP browsing and explicit local/remote transfer flow, progress/cancellation/retry, secure filename/path handling, and a lightweight remote text editor with dirty-state protection, search/replace, and write-back.

Exit criteria: integration tests cover list/upload/download/rename/delete and interrupted transfers; security tests reject traversal and malformed filenames; no remote path selects local files without user action.

### 8. Advanced connection tools

Add validated local/remote forwarding and SOCKS where the selected library and iOS constraints permit, then jump-host routing. Add snippets with explicit execution and variable prompts, command palette, terminal safety preference for unusually large paste, and connection-status affordances.

Exit criteria: each enabled forwarding mode and jump-host path has a real integration test. Unsupported modes are omitted or visibly unavailable, never simulated.

### 9. Product polish, accessibility, and hardening

Add adaptive iPhone/iPad navigation, hardware keyboard and pointer behavior, VoiceOver labels, Dynamic Type outside terminal grid, reduced motion, all required professional themes, first-run flow, and clearly labeled non-sensitive demo mode. Perform threat review, privacy audit, escape-sequence fuzzing, memory/performance profiling, and privacy-safe production logging review.

Exit criteria: accessibility pass on both device classes; no secret or terminal content appears in diagnostics by default; performance acceptance suite passes with simultaneous sessions, streaming output, and file transfer.

### 10. Release readiness

Create EAS development/preview/production profiles, development/build/submit/test-server scripts, optional CI that runs checks and can build but never auto-submits for public review, App Store metadata, privacy policy requirements, reviewer notes, troubleshooting, and release checklist.

Exit criteria: a signed TestFlight candidate is built with developer-provided Apple credentials; release submission remains an explicit human action.

## Testing strategy

- Unit: schema validation, pane-tree operations, resize calculation, state machine, host trust decisions, snippets, settings, migrations, and error redaction.
- Native/integration: disposable SSH server for shell I/O, key auth, known-hosts, SFTP, reconnect, forwarding, and jump hosts.
- UI/e2e: onboarding, server/key flows, real connection, panes, search, SFTP, and editor save/discard.
- Security/resilience: invalid credentials, changed host key, malformed server output and escape sequences, very long Unicode lines, network interruption, rapid reconnect, large paste, and SFTP traversal attempts.
- Device matrix: current supported iOS on at least one iPhone and iPad, in portrait and landscape, including hardware keyboard on iPad.

Every phase ends with tests, lint, strict TypeScript, documentation updates, and—when native code changes—a development-build verification. Do not start the next phase with known failures.

## Documentation and release artifacts

Create and maintain `docs/architecture.md`, `docs/terminal-engine.md`, `docs/ssh.md`, `docs/security.md`, `docs/development.md`, `docs/testing.md`, `docs/eas.md`, `docs/app-store.md`, and `docs/troubleshooting.md` as their related phases land. Keep third-party notices and license obligations with the selected terminal and SSH dependencies.

## Immediate next steps

1. Confirm the target minimum iOS version, supported device/OS matrix, organization/bundle-ID owner, and whether iCloud backup of non-secret metadata is desired.
2. Scaffold Phase 1 without selecting unverified native libraries.
3. Run the discovery gates and make the terminal/SSH architecture decisions before implementing connection UI.
