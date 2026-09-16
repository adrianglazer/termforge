# Architecture — task 01

Decision date: 2026-09-15. Status: design approved for foundation work; native build/device proof pending. Product scope: `instructions.md`; execution order: `tasks/`.

## Repository findings

- Planning-only repository at `ba9c804`; no application, package manifest/lockfile, TypeScript configuration, native directories, dependencies, tests, or EAS project configuration.
- Linux host: Node 20.6.1, npm 9.8.1, EAS CLI 22.0.0; Docker executable available. Swift/Xcode unavailable locally, which is non-blocking under the EAS-first workflow. No EAS build, Apple account, or device access was verified.
- Existing `TASKS.md` and task files were untracked before this work; preserve them.

## Selected stack

These are research baselines, not installed or device-tested dependencies. Task 02 locks the JavaScript graph; task 03 locks the native graph. Record exact resolved versions and licenses when installing. Apply compatible security fixes rather than retaining a vulnerable pin.

| Component                   | Baseline                                           | Reason / license                                                                       |
| --------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Runtime/tooling             | Node 22.23.1, npm 10.9.8; EAS CLI 22.4.0 candidate | Align Node/npm with documented SDK 57 builders; verify CLI installation in task 02     |
| Expo / React Native / React | 57.0.23 / 0.86.3 / 19.2.3                          | Official SDK 57 template pairing; MIT                                                  |
| TypeScript                  | 5.9.3, strict                                      | Compatible with the selected ESLint TypeScript parser; Apache-2.0                      |
| Navigation                  | Expo Router 57.0.21                                | SDK-integrated routes; stable Stack/tabs, custom adaptive sidebar; MIT                 |
| Persistence                 | expo-sqlite 57.0.3                                 | Versioned SQL transactions and offline storage; Expo wrapper MIT, SQLite public domain |
| UI state                    | Zustand 5.0.15, vanilla stores + React selectors   | Small external stores; MIT; no persistence middleware for runtime state                |
| Terminal                    | SwiftTerm 1.19.0                                   | UIKit terminal implementation; MIT; see `terminal-engine.md`                           |
| SSH and SFTP                | Citadel 0.12.1                                     | Native streaming PTY, SFTP, forwarding, jumps; MIT; see `ssh.md`                       |
| Secrets                     | Apple Security + LocalAuthentication               | Native Keychain access, no secret-returning JS API; platform SDK                       |

Use SDK-matched `expo-dev-client`, build-properties, document/file APIs, and navigation peers through `expo install`. Do not add an ORM, backend, analytics, cloud sync, or an extra UI framework. Start with handwritten domain validators; add a schema dependency only if duplication justifies it. Redux adds ceremony for this scope; AsyncStorage cannot replace relational storage; SecureStore would expose retrieved credentials to JS, so it is not the credential boundary.

Sources: [SDK compatibility](https://docs.expo.dev/versions/latest/), [SDK 57 template](https://raw.githubusercontent.com/expo/expo/sdk-57/templates/expo-template-default/package.json), [SDK 57 fixes](https://expo.dev/changelog/sdk-57), [SQLite](https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/), [Zustand package](https://raw.githubusercontent.com/pmndrs/zustand/v5.0.15/package.json), [build images](https://docs.expo.dev/build-reference/infrastructure/).

Choose iPhone iOS **17.0+**: Citadel raises Expo's 16.4 floor. Pin an EAS image that supplies the required Xcode/Swift toolchain; local Xcode is optional. Test a physical iPhone on the oldest supported OS available and current stable OS in portrait and landscape. Repeat signed acceptance through TestFlight. iPad and hardware-keyboard checks are optional and non-blocking. Do not claim iOS 17 support from a newer-OS test alone.

## Ownership and native packaging

```text
app/ routes → src/ feature UI → application services/repositories
                                 ↓ typed adapters
modules/terminal, ssh, sftp, secure-storage → shared native core
                                             ├─ SwiftTerm
                                             ├─ Citadel/NIO
                                             └─ Security/LocalAuthentication
```

- One Expo application; no workspace/monorepo tooling yet. Put features under `src/{servers,keys,sessions,workspaces,terminal,sftp,snippets,settings,storage,state}`.
- Native session registry owns sockets, PTYs, terminal models, transfer/forward tasks, and credential use. JS SessionManager coordinates IDs and workspace membership outside React. Zustand holds observable metadata, never native resources or terminal buffers.
- Native actors/serial executors own mutable state; NIO work stays on its event loops; UIKit stays on the main actor. Bounded ordered queues connect transport and renderer. Unmounting a view detaches it; only explicit close tears down a session.
- Use local Expo Modules with a shared native core, avoiding duplicate SSH runtimes. Preserve source/config plugins under `modules/`; generated `ios/` is disposable. SDK 57 prebuild regenerates native directories by default.
- Packaging decision for the proof: source-build the shared Swift package core into an owned XCFramework, exposing a small Objective-C-compatible facade to the Expo module pods. Include required runtime dependencies/resources once; consume via podspec `vendored_frameworks`. Use pinned source revisions, checksums, and a reproducible EAS build step before pod installation. Do not commit downloaded binaries or assume CocoaPods automatically resolves Swift packages.
- Task 03 must prove this packaging on EAS, including SwiftTerm resources/build plugins, simulator/device slices, and transitive linkage. Failure reopens this decision before native feature expansion. Do not silently switch to an unmaintained wrapper.

Integration references: [Expo native wrappers](https://docs.expo.dev/modules/third-party-library/), [module API](https://docs.expo.dev/modules/module-api/), [Swift package dependencies](https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/addingdependencies/), [CocoaPods framework declaration](https://guides.cocoapods.org/syntax/podspec.html#vendored_frameworks).

## Application contracts

The following names specify Termforge interfaces, not existing vendor APIs. Task 02 defines their TS types; task 03 implements adapters.

| Service        | Operations / results                                                                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Session        | `create(config) → sessionId`; `connect`, `disconnect`, `close`; `snapshot`, `subscribe`; config references server/key IDs and contains no credentials   |
| Secure storage | `generateKey`, `importKey`, `promptCredential`, `publicKey`, `delete`, `lock`; secret entry/import uses native UI; results are metadata and opaque refs |
| Host trust     | `resolveChallenge(challengeId, reject\|once\|save)`; mismatch resolution uses a separate known-host update flow                                         |
| Terminal       | `attach(sessionId)`, `detach`, `sendKey`, `paste`, `resize`, `configure`, `search`, `clearScrollback`; selection/copy remain native where possible      |
| SFTP           | `open(sessionId)`, `list`, `stat`, `mkdir`, `rename`, `remove`, `copy`, `transfer`, `cancel`; local files use native picker-issued handles              |
| Editor         | `readText(path, limit)`, `saveText(path, expectedVersion, text)`; bounded text may enter JS, excluded from persistence/diagnostics                      |
| Forwarding     | `start(spec) → forwardId`, `stop`, `list`; specs discriminate local/remote/SOCKS and reference authenticated sessions                                   |

Every native event includes `sessionId`, `generation`, monotonic `sequence`, event kind, and typed payload. Task events also carry `operationId`; trust events carry a one-use challenge ID. Reconnect increments generation; stale commands/events are rejected. Subscribe then reconcile a native snapshot to recover missed events. Closing/cancelling is idempotent; pending work finishes with a typed cancellation error.

Capabilities explicitly report `available`, `unavailable(reason)`, or `unverified`. Only tested, implemented modes become available. Errors use stable codes: `INVALID_CONFIG`, `DNS_FAILED`, `CONNECTION_REFUSED`, `TIMEOUT`, `AUTH_FAILED`, `KEY_LOCKED`, `KEY_UNAVAILABLE`, `HOST_KEY_UNKNOWN`, `HOST_KEY_CHANGED`, `NETWORK_LOST`, `REMOTE_CLOSED`, `UNSUPPORTED`, `PATH_REJECTED`, `CONFLICT`, `CANCELLED`, `RESOURCE_LIMIT`. Do not pass raw native exceptions or terminal content into errors.

## Persistent model

Use UUID text IDs, UTC timestamps, foreign keys, parameterized queries, and one serialized migration writer. SQLite is the source of truth; publish state changes after successful commits. Enable foreign keys on each connection and WAL. Apply numbered migrations transactionally before mounting feature UI; rollback failures and never reset the database automatically.

| Table                 | Required fields beyond ID/timestamps                                                                                                                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `servers`             | name, normalized host, port, username, auth method, nullable key/credential ref, jump server ID, timeout, keepalive, reconnect policy, terminal type, startup command, environment |
| `keys`                | name, algorithm, public fingerprint, native credential ref, protection policy; no private bytes/passphrase                                                                         |
| `known_hosts`         | normalized logical host, port, algorithm, public key blob, fingerprint, approval timestamp; unique host/port/algorithm                                                             |
| `workspaces`          | name, versioned layout JSON, tab order; leaf configuration references servers, not live sessions                                                                                   |
| `snippets`            | name, command template, description, category, favorite, variable definitions; no saved variable secrets                                                                           |
| `settings` / `themes` | validated versioned preferences / named color tokens                                                                                                                               |
| `connection_history`  | server ID, start/end, safe outcome; bounded retention, no commands/output                                                                                                          |

Layout: `Leaf{id, serverId?, title, terminalOverrides}` or `Split{id, axis: row|column, ratio, children:[Node,Node]}`. Row divides left/right; column divides top/bottom. Validate unique IDs, two children, finite ratio 0.1–0.9, max depth 8, max 8 leaves initially. Closing a leaf collapses its parent; duplication creates new IDs; focus/zoom/live-session mappings remain runtime state. Layouts restore disconnected; reconnect creates fresh native sessions.

Exports use an explicit versioned allowlist for server connection metadata, snippets, workspace definitions, themes/preferences. Exclude credential refs, known-host trust, history, runtime IDs, startup commands/environment by default; imported profiles require credential rebinding. Imported commands/snippets remain inert until explicit execution. Validate size/depth/foreign references and commit imports atomically.

## Handoff and unresolved owner inputs

- Task 02 starts by upgrading Node within its authorized environment, then scaffolds this baseline; no application code was created in task 01.
- Task 03's mandatory proof is defined in `terminal-engine.md`. No device, benchmark, signed build, or integration result exists yet.
- Owner supplies final bundle ID, Apple team/account, Expo project ownership, signing access, and test devices before signed builds. Placeholder configuration must be visibly replaceable.
- Default: no iCloud entitlement/sync; mark app-private metadata/downloads excluded from backup and disclose recovery limits. Apple treats exclusion as guidance, not a secrecy guarantee. See `security.md`. Changing this privacy default requires an explicit product decision.

## Task 03 execution status — 2026-09-16

The independent disposable OpenSSH fixture is implemented and host-verified:
separate target and bastion nodes, generated ignored credentials, encrypted-key
input, SFTP, PTY tools, high-output input, local-forward target, and disposable
host keys are available under `tests/ssh-server/`.

The mandatory native proof gate remains **pending, not passed**. Local Xcode is
not required: EAS is the designated iOS compiler. EAS project/signing setup and
a registered physical iPhone are now available. Baseline build
`f88f0e63-633e-4089-9556-f0628fa80b50` compiled the four Expo module targets on
the `macos-tahoe-26.5-xcode-26.6` image. Installation/launch, native library
interoperability, Keychain behavior, and device acceptance are not yet recorded.
Record the EAS build ID/image, resolved native graph, signing inputs, iPhone/OS,
TestFlight build number, and each proof result before changing a capability from
`unverified`. iPad evidence is optional and does not block the gate.
