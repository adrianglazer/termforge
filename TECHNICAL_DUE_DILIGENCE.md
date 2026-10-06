# Termforge — technical due diligence

**Assessment date:** 6 October 2026 (Europe/Warsaw)  
**Scope:** current working tree, including unfinished/uncommitted work  
**Base commit:** `1409d8a2d3515699d14934d7aee535a172f462c5`  
**Method:** source inspection, executed checks, dependency inventory and advisory review  
**Purpose:** engineering quality, maintainability, extensibility and acquisition/investment readiness

## 1. Executive assessment

**Termforge is a credible, security-conscious early product, with a useful technical foundation, but it is not yet a fully validated, easily transferable production asset.** The implementation deserves continued development. A rewrite would discard substantial useful work; targeted correction, integration testing and clearer ownership boundaries are the appropriate next steps.

The strongest engineering is around sensitive boundaries: native credential handling, host verification before authentication, bounded remote input, protected local files, transactional persistence and explicit release evidence. Strict TypeScript and a fast automated suite provide a sound baseline. The project also avoids a backend, which substantially reduces infrastructure and operational complexity for its current product scope.

The principal weakness is **integration completeness**. Small domain/controller tests pass, while several actual screen-to-native paths do not honor their UI promises. Examples include ignored connection settings, inability to change an existing jump host, split ratios that do not control pane sizes, and missing forwarding-state reconciliation. These are concrete reasons not to equate a green test suite with a finished product.

Maintainability is uneven. Most files are small, but the terminal screen and native module together contain **29.1% of first-party application source lines**. Those two files combine many independently changing responsibilities and are the places where extending the product is most likely to introduce regressions.

**My overall engineering maturity rating is 5.9/10.** This is a judgment using the rubric below, not an industry certification, a defect probability, or a claim that the project is “59% complete.” The code is more disciplined than a disposable prototype, but its release validation and organizational practices have not caught up with its feature breadth.

For a technical buyer, the appropriate conclusion is **conditional acceptance with a remediation plan**, rather than unconditional production sign-off. Require a tested, immutable candidate containing the latest native/purchase code, resolution of the high-priority findings, and a successful handover to another engineer. No valuation, revenue forecast or investment-return conclusion can be established from this repository.

## 2. Evidence and limitations

Three evidence levels are used throughout:

- **Executed:** a check or isolated reproduction ran during this assessment.
- **Source-confirmed:** a behavior or missing integration is visible in inspected code; the corresponding iPhone interaction was not executed here.
- **Recorded / pending:** historical evidence or an outstanding gate described by the repository; not independently repeated on Apple hardware here.

The initial snapshot contained 25 modified tracked files and 11 untracked files. Concurrent startup/security and safe-area work changed the checkout during this review. Those changes were inspected and the JavaScript checks repeated. The closing inventory contained **29 modified tracked files and 14 untracked files**, excluding this report. Commit identity alone therefore does not identify the reviewed product. The closing prospective-source manifest covered **1,217 files**, including **1,016 vendored files**. Its aggregate SHA-256 was:

```text
c9e9f48cbf1bedebe410e724c3df76c442aad69c214616db5ec0604e1b403ac0
```

The opening inventory/test figures were 9,834 application lines and 73 JavaScript cases. Tables below use the closing inventory and the 78-case JavaScript rerun. The native code and dependency lockfile were unchanged between those snapshots. Later edits after this digest require revalidation; this is a bounded review of an actively edited workspace.

This digest was computed from a sorted JSON object mapping repository-relative file paths to SHA-256 file digests, using compact JSON separators. It excludes ignored files and this report. It is a snapshot identifier, not a signed provenance attestation.

Inspection concentrated on application routes, persistence, validation, session ownership, the native bridge, host trust, credentials, file transfers/editor writes, purchase enforcement, tests, build tooling and release documentation. Vendored cryptographic code was provenance-checked, not independently cryptographically audited. Website source and hosting configuration were inspected; the live deployment was not inspected.

No fresh signed iOS build, StoreKit purchase, physical-device acceptance run, penetration test, fuzzing campaign, production telemetry analysis or source-control hosting policy audit was performed. No application behavior or dependency versions were changed for this assessment. Existing code and pending changes were preserved.

## 3. Measured statistics

### Source inventory

Counts use tracked plus nonignored untracked regular files. Generated output, installed dependencies, native build caches and `native/Vendor/` are excluded from first-party source totals. “Lines” means physical lines, including comments and blanks; it does **not** mean executable statements. Source extensions counted were TS/TSX, JS, Swift, shell, HTML/CSS and common C-family extensions.

| Area                                                          | Source files | Physical lines | Nonblank lines |
| ------------------------------------------------------------- | -----------: | -------------: | -------------: |
| Application/runtime source, including legacy module scaffolds |           93 |          9,935 |          9,431 |
| Tests and executable fixture support                          |           21 |          2,190 |          2,051 |
| Build/release/configuration code                              |           12 |            570 |            535 |
| Static website and deployment script                          |            6 |          2,518 |          2,502 |
| **Total first-party source in these categories**              |      **132** |     **15,213** |     **14,519** |

YAML, JSON, Dockerfiles, nginx configuration, assets and prose documentation are not counted as source lines in this table, although relevant files were inspected.

| Application source breakdown              | Files | Lines |
| ----------------------------------------- | ----: | ----: |
| `app/`                                    |    16 | 3,930 |
| `src/`                                    |    44 | 2,737 |
| `modules/`                                |    19 |   327 |
| `native/TermforgeNative/`                 |    13 | 2,921 |
| `native/TermforgeNativeProbe/`            |     1 |    20 |
| TSX across application directories        |    24 | 4,330 |
| TypeScript across application directories |    50 | 2,456 |
| Swift across application directories      |    19 | 3,149 |

The last three rows are an alternative language breakdown, not additional source.

### Maintainability indicators

| Indicator                                |                          Measured result | Interpretation                                                                            |
| ---------------------------------------- | ---------------------------------------: | ----------------------------------------------------------------------------------------- |
| Median application file length           |                                 54 lines | Most individual units are small                                                           |
| Application files over 300 lines         |                            6 / 93 (6.5%) | Concentrated complexity rather than universally oversized files                           |
| Application files over 500 lines         |                            2 / 93 (2.2%) | Both are central product paths                                                            |
| Application files over 1,000 lines       |                                        2 | Explicitly at odds with the repository's preferred structure                              |
| `app/terminal.tsx`                       |         1,553 lines; 39 `useState` calls | Connection, trust, files, editor, forwards, keyboard and presentation share one component |
| `TermforgeNativeModule.swift`            |                              1,335 lines | Session registry, Expo API, SSH, keys, SFTP/editor and forwarding share one file          |
| Combined size of these two files         | 2,888 lines; 29.1% of application source | High change concentration                                                                 |
| Explicit TypeScript `any` nodes          |                                        0 | Good type discipline within first-party application TS/TSX                                |
| TypeScript suppression comments          |                                        0 | No `@ts-ignore`, `@ts-nocheck` or `@ts-expect-error` found in that scope                  |
| Non-null assertions / type assertions    |                                   4 / 27 | Small escape-hatch inventory; assertions still require runtime boundary checks            |
| Configured TypeScript ESLint rules       |                                        3 | Passing lint provides a narrow assurance level                                            |
| Git commits / distinct author identities |                                    6 / 1 | Limited repository-visible history and high ownership concentration                       |

AST counts used the installed TypeScript parser. No measured cyclomatic complexity, duplication percentage, coverage percentage or industry percentile is claimed. File size and hook counts are risk indicators, not proof that every large file is badly written. Git author identity is not a verified headcount or legal ownership record.

### Dependencies and tests

| Indicator                                                 |                                    Result |
| --------------------------------------------------------- | ----------------------------------------: |
| Direct npm dependencies / development dependencies        |                                   15 / 10 |
| npm lockfile package installation entries, excluding root |                                       934 |
| Distinct npm package name/version pairs in lockfile       |                                       883 |
| Remote native package pins                                |                                        10 |
| Reviewed local native vendor baselines                    |               2: Citadel and Swift Crypto |
| Vendored files checked against recorded hashes            |                                     1,013 |
| JavaScript tests executed                                 |       **78 passed / 78**, across 15 files |
| Portable Swift tests executed                             | **23 passed / 23**, across 5 test classes |
| Total executed tests                                      |                      **101 passed / 101** |
| JavaScript test source / Swift test source                |                         1,777 / 388 lines |
| Test plus fixture-source lines / application-source lines |                                     22.0% |
| Configured coverage threshold                             |                                      None |
| Measured line/branch coverage                             |                           **Unavailable** |
| Automated rendered-screen or end-to-end app suites found  |                                     **0** |

The 22.0% ratio is source volume, **not test coverage**. Test counts include parameterized cases. Four of the eight access tests inspect native source wiring rather than execute the Apple service. Portable native tests compile four production core files totaling 434 lines, plus vendor code; they do not compile the full UIKit/StoreKit/Keychain/Expo implementation. That compiled-source count is also not a coverage measurement.

## 4. Checks performed and actual results

| Check                                                                 | Result and interpretation                                                                        |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| JavaScript tests on Node 24.4.1                                       | Pass: 78 tests, 15 files on closing refresh; reported runner duration approximately 0.70 seconds |
| TypeScript `tsc --noEmit`                                             | Pass under current configured scope                                                              |
| ESLint with zero warnings allowed                                     | Pass under the three configured TS rules                                                         |
| Repository formatting commands                                        | Pass for their selected paths                                                                    |
| Native provenance and package-scope verification                      | Pass: 1,013 vendored hashes and 10 remote pins                                                   |
| Release configuration and bounded secret scan                         | Pass: 1,214 prospective-source files                                                             |
| Git whitespace check                                                  | Pass                                                                                             |
| Swift tests in cached `swift:6.2-noble`, external networking disabled | Pass: 23 XCTest cases; Swift 6.2.4; approximately 11.9 seconds of test execution                 |
| Full npm advisory query                                               | Completed; **29 affected package entries: 2 critical, 15 high, 12 moderate**                     |
| Isolated server-draft reproductions                                   | Confirmed jump-host edit and timing-validation defects                                           |
| Configuration export with a dangling jump reference                   | Confirmed rejection                                                                              |
| Current Apple build / purchase / device acceptance                    | Not executed; remains an evidence gap                                                            |

The host initially selected Node 20.6.1, below the project's declared minimum. That run passed 71 tests and failed two SQLite tests because the installed native SQLite binding was built for Node 24. Using the already installed, documented Node 24.4.1 resolved both failures without modifying dependencies. This is an environment-selection issue, not two confirmed product failures. A checked-in runtime selector would improve onboarding.

The combined release command initially stopped at a sandbox process restriction when its Git scan ran. The release-verification step was then successfully run outside that restriction, and the whitespace check passed. The component checks passed; the initial interrupted command is not represented as a single uninterrupted successful run.

SwiftPM emitted a material forward-compatibility warning: remote and local Swift Crypto dependencies share a conflicting package identity, and a future SwiftPM version may treat this as an error. It also reported an unhandled Metal resource on Linux. Passing portable tests should not hide either warning; the latter is not evidence of a failing Apple archive.

The final attempt to repeat release verification after the concurrent edits and report creation was not executed: automatic approval review reached its usage limit. This was an approval-service availability failure, not a determination that the command was unsafe. The earlier release/secret scan passed on 1,214 files; it does not cover the later additions. Closing tests, lint, typecheck and configured formatting passed, but the closing release-scan gate remains unverified.

A separate production-only npm audit was rejected by automatic approval review because it would transmit dependency metadata to npm. It was not retried through another route. The figures here use the successfully completed **full audit**, with local dependency-path inspection. The earlier repository figure of 26 production-tree findings is historical, not a fresh production-only result.

## 5. Architecture and code quality

### What is well designed

1. **Sensitive native boundary.** The production JS API exposes opaque credential references, public metadata and native prompts. Private-key material and passwords are not ordinary React application state. Native host-trust challenges expire, are consumed once and are checked against endpoint, generation, lock revision and persisted trust. See `TermforgeHostTrust.swift` and `TermforgeCredentialPrompt.swift`.
2. **Remote output stays native.** Terminal streaming does not continually copy terminal buffers through React state. `TermforgeOutputGate.swift` limits hostile control sequences; remote clipboard/link actions are restricted. These are appropriate choices for performance and a security-sensitive terminal.
3. **Small, testable non-UI units exist.** Session, SFTP and key controllers accept adapters. Pane manipulation, imports, snippets and purchase decisions have separable logic. This gives the project a workable path toward stronger integration coverage without a wholesale rewrite.
4. **Persistence is deliberate.** SQL uses bound parameters, migrations have a ledger and transactions, WAL/foreign keys are enabled, and imports use an exclusive transaction. Key deletion records pending work so metadata and Keychain can recover across interruption.
5. **Data export is an allowlist.** Export reconstruction strips unknown nested data and excludes secrets and host trust. Import validates size, identities, layout and references. This is considerably safer than serializing arbitrary application state.
6. **Resource limits are explicit.** The native code bounds sessions, forwarding channels, terminal input, key-import work, editor size and transfers. These controls have targeted tests, including real loopback SSH and backpressure behavior.
7. **Purchase authority is native.** Verified StoreKit state drives remote access, while JS presents it. The portable purchase model exercises expiry, original acquisition, rollback detection and lifetime precedence. Local recovery paths remain conceptually separate from remote authorization.

### What makes future changes harder

- **The actual architecture differs from the opening design document.** The live path is routes/controllers → `src/native/termforgeNative.ts` → the inline native module. Several `modules/` implementations are old scaffolds, and `src/native/contracts.ts`/`src/repositories/contracts.ts` describe contracts not enforced by the live implementations. Zustand is declared but no application import was found. A new maintainer must distinguish plans, prototypes and production code.
- **Business orchestration remains inside screens.** The terminal screen contains trust review, connection configuration, SFTP actions, editor handling and forwarding state. The server screen duplicates draft-mapping logic already available in a helper. Tests of extracted helpers therefore do not prove the actual UI uses those helpers correctly.
- **Native APIs have hand-maintained cross-language contracts.** Connection options cross the bridge as JSON strings; many native events/results use dictionaries. TS strictness cannot verify the Swift implementation, event names or options. The missing forwarding subscription is a concrete example of contract drift.
- **Shared state lacks a consistent update mechanism.** Screens independently load repositories; `ThemeProvider` reads settings once at mount, while settings changes do not publish to it. Existing screens can remain stale until remounted. This can be fixed with a small explicit notification/state layer; adopting a large framework is unnecessary.
- **Errors are privacy-conscious but sometimes uninformative.** The native session code classifies errors partly by matching text; several best-effort operations suppress errors. UI code sometimes wraps a typed failure in a plain `Error`, after which `safeError` converts it to a generic unsupported message. Preserve stable codes while keeping sensitive content redacted.
- **Swift readability is weaker than TypeScript readability.** Dense one-line declarations, multiple statements per line and no enforced Swift formatting/lint convention make the most sensitive code harder to review. Swift actor/lock choices are thoughtful, but `@unchecked Sendable` boundaries deserve explicit ownership documentation and Apple concurrency validation.

## 6. Findings requiring action

Priorities reflect product impact and release decisions, not CVSS: **P1** before broad paid release or technical acceptance; **P2** near-term corrective work; **P3** cleanup. Source line references were captured during inspection and can shift slightly in the concurrent edits; the named functions remain the authoritative locations. Related weaknesses are grouped to avoid pretending that this is an exhaustive defect census.

### F01 — P1: the current monetization/native candidate lacks Apple acceptance evidence

**Evidence:** recorded/pending. `docs/monetization.md`, `docs/release-checklist.md` and the task 08 record distinguish the signed 0.1.0/build 4 artifact from later StoreKit and terminal changes. The portable manifest excludes `TermforgeAccessService.swift`, its Keychain storage adapter and most Apple-native code from tests.

**Additional closing evidence:** the concurrently updated `docs/testing.md` records a tester-reported protected-data startup failure on an unlocked device. A new startup controller waits for foreground, retries an unchanged lock revision and exposes redacted stage diagnostics. Its new regression cases pass here, but no corrected-candidate device launch was verified. This is a recorded user/device failure with a locally tested proposed correction, not an independently confirmed root-cause diagnosis.

**Impact:** the revenue gate, restore flow, native expiry enforcement and current keyboard integration have not been established on the actual candidate by the evidence available here. A historical signed archive cannot validate later source changes.

**Acceptance:** build the consolidated immutable source, then execute purchase/cancel/pending/restore/refund/offline/expiry tests and device checks for trust prompts, locks, Files providers, lifecycle and accessibility. Record exact source, binary, device and OS. Confirm registered products and release materials. This is a release blocker, not a conclusion that StoreKit is currently broken.

### F02 — P1: editable connection settings do not reach the connection implementation

**Evidence:** source-confirmed. `app/servers.tsx:256` onward exposes timeout, keepalive, terminal type, startup command and “Reconnect after interruption.” `app/terminal.tsx:378` onward sends endpoint/authentication and dimensions, without those saved settings. Native option structures omit them; `TermforgeNativeModule.swift:225` hardcodes a 15-second connection timeout and line 266 hardcodes `xterm-256color`. Retries are limited to initial transient connection attempts; established-session termination closes the session.

**Impact:** users can save settings that are silently ignored. Turning reconnect off does not control the native initial retry loop, and enabling it does not provide the advertised post-interruption behavior. Startup commands are stored but not executed through the inspected connection path.

**Acceptance:** either implement and test the settings end to end or remove/disable unsupported controls with accurate copy. For startup commands, preserve explicit execution/trust safeguards. Include a test that captures the actual native options produced from a saved profile.

### F03 — P1: remote editor replacement does not preserve file metadata

**Evidence:** source-confirmed risk, not a device reproduction. `TermforgeNativeModule.swift:1038` hashes the old content, creates a new temporary file, renames the old path to a backup, then renames the temporary file into place and removes the backup. It does not copy original permissions or other attributes. Citadel's `withFile` defaults to `.none` attributes (`native/Vendor/Citadel/Sources/Citadel/SFTP/Client/SFTPClient.swift:302`).

**Impact:** saving can replace an executable/private file with a new inode using server-default permissions and ownership behavior. Under a permissive default umask, a formerly private file could become more broadly readable. The two renames also leave a window with no original path, and fingerprint checking is not an atomic compare-and-swap against concurrent writers. A lost connection can prevent rollback. These are limits on integrity/confidentiality claims, not proof of an exploit on every server.

**Acceptance:** define and preserve required metadata, fail safely where that is impossible, test modes such as `0600` and `0755`, concurrent remote modification and interruption between renames, and provide discoverable recovery for stranded backups. Do not describe this as universally atomic or race-free saving.

### F04 — P2: editing a server cannot remove or change its existing jump host

**Evidence:** executed. At `src/servers/model.ts:58`, the existing `jumpServerId` is spread after the edited draft, overwriting it. The UI's “None” choice removes the draft property but the mapping restores the old value.

```text
Existing jump-a; draft removes jump → actual saved model: jump-a
Existing jump-a; draft selects jump-b → actual saved model: jump-a
```

**Impact:** profile editing silently retains the old routing choice. `app/servers.tsx:73` also duplicates profiles without copying their jump-host selection, creating another inconsistency in this flow.

**Acceptance:** the draft must be authoritative for edit/clear, duplication should follow an explicit policy, and tests should cover new, changed, cleared and duplicated jump references.

### F05 — P2: workspace ratio controls change the label but not pane geometry

**Evidence:** source-confirmed. `app/workspaces.tsx:115` persists a new ratio. Rendering at lines 332–371 displays that ratio but passes no proportional sizing to child panes. Leaf style uses `flex: 1`; live-terminal height is fixed at 240 (`app/workspaces.tsx:489`).

**Impact:** the displayed percentage changes without implementing the requested split sizing. Tests of `resizeSplit` alone cannot catch a missing rendering connection.

**Acceptance:** apply ratio-aware constraints in both axes and verify nested splits, minimum dimensions and rotation with a rendered/device test.

### F06 — P2: removing workspace structure does not close its live sessions

**Evidence:** source-confirmed. `app/workspaces.tsx:101` removes a pane definition and `:153` deletes workspace metadata without calling `sessionManager.close` for affected panes. The separate disconnect action does close sessions, but deletion does not invoke it. `SessionController.create` also does not enforce a single live session per pane.

**Impact:** foreground SSH/forwarding work can outlive its removed UI and occupy the native eight-session limit. Background locking eventually tears down sessions, but that is not a substitute for deletion semantics.

**Acceptance:** coordinate layout deletion and session teardown; define failure behavior and whether replacing a pane's connection closes the old one. Test close-pane, delete-workspace and duplicate-connect flows with a live adapter.

### F07 — P2: local editing and deletion can create records the exporter rejects

**Evidence:** executed and source-confirmed. `validateServer` checks basic identity/port/authentication but not timeout/keepalive ranges. Isolated `serverFromDraft` calls accepted `NaN`, `-1` and `999999` timing values. The importer/exporter enforces stricter integer ranges. `ServerRepository.remove` deletes only the server; schema references do not protect `jump_server_id` or server references inside workspace JSON. Export of a target referencing a deleted jump server reproduced `INVALID_CONFIG`.

**Impact:** ordinary local operations can produce data that cannot be exported, or invalid bindings that fail during persistence/connection. Deleting a server referenced by a workspace has the analogous dangling-reference problem.

**Acceptance:** share runtime validation between editor/import/repository boundaries; implement restrict-or-detach deletion for dependent profiles and panes in a transaction. Test that every valid state reachable through the UI remains exportable.

### F08 — P2: remote-forward failures are not reconciled into the UI

**Evidence:** source-confirmed. `TermforgeNativeModule.swift:421` returns a forward ID while a task negotiates the remote forward, then emits `onForwardState` for readiness/failure. `src/native/termforgeNative.ts` has no typed listener overload for that event. `app/terminal.tsx:640` immediately lists the returned forward, and there is no application subscription to its later status.

**Impact:** a server can reject a forward while the UI continues to list it without showing the failure. Disconnect/session changes can also leave locally retained forward rows misleading.

**Acceptance:** represent pending/ready/failed/stopped states, subscribe and reconcile events using session/generation/sequence, and clear or refresh state when sessions end. Test asynchronous server rejection, not only successful forwarding helpers.

### F09 — P1 triage / P2 remediation: dependency review does not cover the fresh full audit

**Evidence:** executed full audit; details in section 7. Two critical-rated advisories affect installed `shell-quote` and development-only Vitest. These are not demonstrated critical vulnerabilities in the shipped iPhone app. The current review document covers a narrower, older result and does not contain these findings.

**Acceptance:** review actual reachability, apply compatible fixes with regression checks, and retain explicit time-bounded dispositions for the remainder. Include development/build tooling in the vulnerability process. Do not resolve the scanner by blindly taking its suggested Expo downgrade.

### F10 — P2: CI validates only part of the production stack

**Evidence:** source-confirmed. `.github/workflows/ci.yml` has one Ubuntu job running `npm ci` and `npm run release:check`. There is no Swift execution, Apple compilation, rendered UI test, coverage gate or automated advisory scan in that workflow. The typecheck includes `app`, `src` and `tests`, not the legacy `modules/` TS wrappers; lint has three TS rules and no React Hooks or type-aware promise checks. Release scripts/plugins receive limited static checking, and Swift has no formatting gate.

**Impact:** a green pull request can contain invalid Apple integration or ineffective user controls. The defects above demonstrate this rather than merely hypothesizing it.

**Acceptance:** add portable native tests, focused rendered/native-contract tests, suitable hook/promise rules and a documented Apple compile gate. Add coverage reporting before setting realistic thresholds; require boundary tests for changed behavior. Confirm branch protection and independent review in the hosting service, which local YAML cannot establish.

### F11 — P2: ownership concentration and stale architecture increase handover risk

**Evidence:** six commits under one author identity; two central monoliths; legacy module scaffolds and unused contracts; a historical architecture document followed by append-only updates. Source already differs from the last committed revision in 43 files. The SwiftPM dependency-identity warning is another future maintenance obligation.

**Impact:** maintainers need substantial contextual knowledge to decide which APIs, documents and build paths are authoritative. Broad commits and mutable working trees make regressions and release provenance harder to isolate.

**Acceptance:** consolidate a current architecture map, designate live interfaces, remove obsolete scaffolding after checking native registration, split the two hotspots around actual responsibilities, resolve native package identity, and complete a second-engineer build/debug/release exercise. Preserve the useful security boundaries during this work.

## 7. Dependency, supply-chain and IP assessment

### Current npm advisory evidence

The successful full audit returned **29 affected package entries but only seven distinct advisory identifiers**. For shell-quote specifically, npm/GitHub database aggregation labeled the finding critical, while the upstream advisory displayed high (CVSS v3 8.1); the totals retain npm’s labels rather than silently reconciling different scoring systems. Parent-package propagation inflates the entry count; it is not 29 independent vulnerabilities. Severity totals are registry ratings, not assessed application exploitability.

| Advisory / installed component                               | Fresh evidence and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GHSA-pqg4-j6r4-53mv` — `shell-quote` 1.10.0; critical       | Local dependency path is React Native → `react-devtools-core` 6.1.5 → `shell-quote`. The affected quoting pattern requires a comment token followed by attacker-controlled line-terminated text; fixed in 1.11.0. Review callers and production bundling; a compatible lockfile fix is reported available. No vulnerable app input path was demonstrated. [Upstream advisory](https://github.com/ljharb/shell-quote/security/advisories/GHSA-pqg4-j6r4-53mv). |
| `GHSA-5xrq-8626-4rwp` — Vitest 4.0.16; critical              | Development tool. The upstream conditions concern exposed API/UI servers or Windows UI/browser use. This repository runs Node tests with `vitest run`, without those configured modes, so the inspected CI path does not establish that exposure. Upgrade and document safe developer use. [Upstream advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp).                                                                 |
| `GHSA-82fw-gwwq-j7x9` — Vitest / `@vitest/mocker`; moderate  | A second development-tool advisory. The audit proposes Vitest 4.1.11, which also exceeds the critical advisory's fixed 4.1.0 boundary. Compatibility still needs normal validation. [Upstream advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9).                                                                                                                                                                        |
| `GHSA-vfj7-8cjw-p6xm` — braces 3.0.3; high                   | Fresh match; repository triage places it in build-time glob processing. That existing reachability disposition must remain tied to trusted build inputs.                                                                                                                                                                                                                                                                                                      |
| `GHSA-86w9-cpqp-85rv` — node-forge 1.4.0; high               | Fresh match; existing review places affected verification in Expo/build tooling rather than native SSH. Revisit if signing/update/certificate workflows change.                                                                                                                                                                                                                                                                                               |
| `GHSA-vcc3-ghjq-m6fr` — decode-uri-component 0.2.2; moderate | Fresh match on a more relevant runtime path. The external-link guard rejects oversized, malformed and nested percent-encoded inputs; tests exercise that guard. Preserve it until the dependency path is fixed.                                                                                                                                                                                                                                               |
| `GHSA-w5hq-g745-h8pq` — uuid 7.0.3; moderate                 | Fresh match; existing triage distinguishes affected buffer-taking APIs from the project-generation caller.                                                                                                                                                                                                                                                                                                                                                    |

For the last four, see the source-linked discussions in [the existing dependency review](docs/dependency-security-review.md). Their previous assessments were inspected, not independently exhaustively proven across every transitive caller. Audit remediation suggestions included a major Expo downgrade for some chains; that is not a sensible automatic fix for this product.

The `--omit=dev` distinction must not be confused with “ships to iPhone”: Expo/React Native build tools can appear in the production dependency graph without being bundled as executable mobile code. Conversely, vulnerable build tooling can matter even when it is absent from the app binary.

### Native dependencies

Ten remote packages have version/revision pins, and two local packages retain source manifests and patches. The provenance checker passed. This is useful evidence of controlled inputs, but a checksum list maintained in the same repository is not independent proof that the inputs are secure.

The repository records the Swift Crypto `_CryptoExtras` advisory and deliberately removes that unused linked product while retaining the 3.15.1 baseline. Current source/provenance checks support the declared wiring. The historical archive inspection is useful, but no fresh native advisory service query or current Apple archive inspection was completed here. Do not advertise a clean native security audit.

Citadel patches, the Wellz26 NIOSSH fork and the local Swift Crypto manifest adaptation create a continuing integration responsibility. Assign an owner for upstream tracking, vulnerability triage and compatibility tests. The emitted SwiftPM identity warning makes this more than a theoretical concern.

GitHub Actions use version tags rather than immutable commit hashes. CI has read-only contents permission and disables persisted checkout credentials, both positive controls. A formal SBOM, signed provenance and independently verified source-to-binary mapping were not found in the inspected release workflow. Add them if required by an acquirer; do not claim a SLSA level from lockfiles alone.

### Licenses and ownership

Direct dependencies have documented license review and notice-generation tooling. The installed transitive graph is broader than “all MIT”: among 850 available package manifests, examples include `lightningcss` and its installed binaries under MPL-2.0, `caniuse-lite` under CC-BY-4.0, and node-forge with a BSD/GPL alternative declaration. Another 84 lock entries had no installed manifest on this platform, so this was not an exhaustive cross-platform license inventory. License declarations alone do not establish which code is redistributed or which obligations apply.

For a transaction, require an artifact-specific license/notice inventory, review the actual distributed application and website image, and verify rights to first-party code, assets, vendor patches and any contractor contributions. The repository has no root first-party LICENSE; `private: true` prevents accidental npm publication but is not an IP assignment or ownership instrument. Module-level licenses and Git authorship do not settle chain of title. This section identifies evidence needed, not a legal compliance opinion.

## 8. Standards and engineering-practice alignment

**The project does not demonstrate compliance with “all possible code standards.”** That is not a finite or meaningful acceptance target. The relevant question is whether selected standards and practices match the product's risks and have verifiable evidence.

| Practice / reference                                 | Assessment                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository conventions (`.codex/AGENTS.md`)          | Partial. Most files are focused, but the two >1,000-line files conflict with stated structure guidance. Business logic is distributed across controllers and screens rather than consistently under `src/domain`. The pnpm preference conflicts with the actual npm lockfile/CI workflow.                                                                    |
| TypeScript safety                                    | Good baseline: strict mode, checked indexing, exact optional properties, override and switch protections. Does not validate runtime native values or user input automatically.                                                                                                                                                                               |
| Formatting and static analysis                       | Good TS formatting discipline; narrow lint scope/rules, no native style gate or hook/type-aware rules. Format pass does not imply all repository files are standardized.                                                                                                                                                                                     |
| Separation of responsibilities / maintainable design | Partial. Useful adapters and repositories coexist with screen orchestration and the native monolith. No need to add patterns merely to claim SOLID compliance.                                                                                                                                                                                               |
| OWASP MASVS / MASTG                                  | Several relevant storage, authentication, network, platform and privacy controls are present. No full control-by-control assessment or independent mobile penetration-test evidence exists here. Do not claim MASVS compliance. [Official MASVS](https://mas.owasp.org/MASVS/).                                                                              |
| NIST SSDF                                            | Partial alignment through pinned inputs, checks, source records and vulnerability notes. Organizational ownership, review evidence and ongoing vulnerability-response processes need strengthening. This is a qualitative comparison to the published SSDF 1.1 reference, not certification. [NIST SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final). |
| Accessibility                                        | Roles, labels and some preference helpers exist; no measured VoiceOver, focus, Dynamic Type, contrast or complete keyboard acceptance for this candidate. Input-label associations deserve review. No WCAG conformance claim. [W3C mobile guidance](https://www.w3.org/TR/wcag2mobile-22/).                                                                  |
| Apple platform/release requirements                  | Historical Apple compilation and documented gates exist. Latest purchase/native/device evidence and final store/legal materials remain pending. A settings declaration alone does not prove App Store acceptance.                                                                                                                                            |
| Reproducible delivery                                | Partial: lockfiles, native pins, notices and source-snapshot tooling are strong ingredients; current dirty source, ignored historical artifacts and incomplete current-candidate evidence prevent a full reproducibility claim.                                                                                                                              |

External references were consulted on the assessment date. The standard names above are reference frameworks, not an exhaustive compliance checklist, and their applicability must be explicitly scoped before a formal audit.

## 9. Testing quality and missing assurance

The suite is valuable. The closing refresh passed 78 JavaScript tests after concurrent work added five startup regression cases; combined with 23 unchanged portable native cases, the assessment executed 101 passing cases at its closing scope. Real SQLite tests exercise persistence/reopen and migration rollback. Security tests check export allowlists, malformed imports, host changes and redacted diagnostics. Native loopback tests exercise authentication delays, wrong-host rejection, a bastion, forwarding backpressure and real OpenSSH key envelopes. These are stronger than tests that merely assert implementation constants.

However, the suite is concentrated on helpers and portable boundaries. There is no rendered React Native screen suite, and Apple integration is excluded from portable compilation. Source-string assertions can detect a removed guard but cannot prove guard ordering, concurrency behavior or that the relevant branch executes. The current defects in settings, pane sizing and forwarding show where those limits matter.

The highest-return additions are:

1. Saved-profile → actual native connection-options tests, including disabled/enabled reconnect and jump edits.
2. Rendered workspace tests for sizing and session ownership when panes/workspaces are removed.
3. Native bridge integration for session/forward events, stale snapshots, background/foreground and teardown.
4. Remote editor tests for permissions, interrupted replacement, concurrent writers and recoverability.
5. StoreKit integration on Apple for acquisition, restore, revocation and expiry while work is active.
6. End-to-end local-data consistency tests: edit, delete referenced records, export and restore.

Add line/branch reporting with a baseline, then set thresholds for important domain and boundary modules. A single high repository-wide percentage would be misleading if it excludes the Apple-native execution paths. No coverage dependency was installed or configuration changed just to manufacture a percentage for this report.

## 10. Performance, scalability and operations

### Performance and capacity

The architecture is sensible for a local iPhone SSH client. Remote hosts execute commands; there is no application backend to scale per user. Native streaming and explicit limits reduce obvious resource risks. The inspected limits include eight foreground sessions, four forwards per session, eight simultaneous transfer operations, 16 KiB individual input/64 KiB queued input, 2 MiB editor files and 256 MiB transfers. Scrollback is configurable up to 100,000 lines.

These are **configured ceilings, not benchmarked safe capacities**. No current-device measurements of peak memory, input latency, frame rate, thermal behavior, battery use, transfer throughput or multi-session stability were produced. Main-thread terminal rendering and synchronous Keychain clock persistence deserve profiling under sustained output. Directory results can contain thousands of entries and are rendered through scrolling/mapping rather than a demonstrated virtualized-list performance strategy.

Before broad release, define acceptance budgets on an actual supported iPhone for four concurrent terminals, high output, a large directory, transfer plus editor activity, rotation and extended foreground use. Record crash-free operation and resource peaks. Avoid inventing throughput or user-capacity figures from unit-test timings.

### Operational readiness

The no-account/no-backend design lowers ongoing infrastructure exposure and supports a privacy-oriented product. It also limits support visibility and cross-device recovery. Redacted allowlisted diagnostics are a good foundation, but no production crash/performance evidence or formal incident-response process was available. Consider opt-in, redacted diagnostic export and platform-provided crash reports without collecting terminal content or credentials.

Backup exclusion and device-bound credentials are intentional security/product tradeoffs. Metadata export is not a full backup, and customers need accurate recovery expectations. Schema rollback/downgrade behavior and recovery from corrupt local state need a documented support procedure.

The static website has a small attack surface: no JS, restrictive CSP, a digest-pinned nginx image, non-root execution, read-only filesystem and dropped capabilities in Compose. Public HTTPS, deployed image identity, patch cadence, contacts, legal copy and media were not verified. Its deploy script is tied to a personal SSH alias and uses a mutable application image tag; documented environment configuration and digest-based rollback would improve transferability.

## 11. Extensibility and handover assessment

| Likely change                                        | Relative difficulty                 | Reason                                                                                                                                                |
| ---------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add a metadata field or simple local screen          | Low to medium                       | Existing SQL migrations, repositories and route conventions are understandable; shared validation should come first                                   |
| Add a terminal toolbar action                        | Medium                              | Native/JS contracts and the large terminal component both change                                                                                      |
| Add an SSH authentication mode or more complex jumps | High                                | Trust ordering, credential lifetime, native fork capabilities and UI orchestration must change together                                               |
| Extend editor/transfer behavior                      | Medium to high                      | Native filesystem/remote commit correctness and session lifetime matter; regression coverage is incomplete                                            |
| Change monetization                                  | Medium to high                      | Portable state model helps, but StoreKit integration and current Apple evidence are incomplete                                                        |
| Add Android support                                  | High / separate substantial project | The native security, terminal, Files, lifecycle and purchase implementations are iOS-specific; React Native UI reuse does not supply those boundaries |
| Add sync, team accounts or enterprise policy         | High / architecture expansion       | Introduces a backend, identity, conflicts, recovery and a materially different threat model                                                           |

The code's main asset is its integrated product and carefully chosen security boundaries, rather than a proprietary SSH or terminal engine. Core protocol/rendering capability comes from third-party libraries. That is a reasonable engineering choice; it also means a buyer must budget for upstream compatibility and specialist Swift/NIO/iOS knowledge.

Repository-visible ownership is concentrated in one author identity. Confirm actual maintainers, account ownership, signing/recovery access and rights separately. Require a second engineer to reproduce a build, diagnose one failure and make a small reviewed change using the documentation. Until that happens, “easy to hand over” is unproven.

## 12. Rating methodology

Scores are evaluator judgments rounded to half-points where useful. Anchors: **3** = prototype with substantial uncontrolled gaps; **5** = working foundation with material assurance/maintenance gaps; **7** = coherent, well-tested and repeatable engineering; **9** = strong evidence over sustained production operation. A score of 10 is not “all standards met.”

| Dimension                              |   Weight | Score / 10 | Main reason                                                                        |
| -------------------------------------- | -------: | ---------: | ---------------------------------------------------------------------------------- |
| Architecture                           |      15% |        6.5 | Sound native/security direction; uneven actual layering                            |
| Maintainability and readability        |      15% |        5.5 | Small median file, but two central monoliths and duplicated/stale paths            |
| Functional correctness and integration |      15% |        5.0 | Multiple source-confirmed integration defects despite green checks                 |
| Security design                        |      15% |        7.0 | Strong boundaries and limits; editor risk and incomplete Apple/security validation |
| Automated verification                 |      15% |        6.0 | Meaningful portable tests; no screen/E2E coverage and no measured coverage         |
| Build and release engineering          |      10% |        6.0 | Useful checks/provenance; current candidate and native CI gaps                     |
| Dependency management                  |       5% |        5.0 | Controlled inputs, but unresolved advisories/forks/toolchain warning               |
| Documentation                          |       5% |        7.0 | Detailed and candid evidence; current architecture buried in historical updates    |
| Operability and performance evidence   |       3% |        4.0 | Clear limits; little current-device/production measurement                         |
| Team resilience and handover           |       2% |        3.0 | Concentrated visible ownership; no demonstrated independent handover               |
| **Weighted total**                     | **100%** |    **5.9** | **58.8/100 before rounding**                                                       |

The security score evaluates design quality, not a security certificate. Unknown production behavior reduces confidence rather than being counted as an observed failure. Fixing F02–F08 and closing the Apple/integration-test gaps could materially improve the assessment without changing the overall product architecture.

## 13. Recommended remediation and acceptance plan

| Stage                         | Work                                                                                                                                                        | Evidence required to close                                                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Before broad paid release     | Resolve connection-setting promises, jump editing, editor metadata safety, workspace sizing/session deletion, export consistency and forward status         | Focused regression tests plus one integrated device walkthrough of the corrected flows                                           |
| Before broad paid release     | Triage fresh dependency findings, validate compatible updates or documented mitigations                                                                     | Updated lockfile if appropriate, repeated tests/build, advisory register with owner and review date                              |
| Before broad paid release     | Produce the consolidated native/purchase candidate and complete device/StoreKit gates                                                                       | Immutable source identifier, signed binary, device/OS matrix, real purchase/restore/expiry evidence and finalized release inputs |
| First maintainability cycle   | Extract terminal connection/trust, files/editor and forwards into focused modules; separate the native registry from Expo definitions and SFTP/key services | Behavior preserved under integration tests; clearly owned interfaces; no parallel replacement stack                              |
| First maintainability cycle   | Add native CI, selected UI tests, useful lint rules, runtime selection and dependency monitoring                                                            | Repeatable clean-checkout CI and documented Apple compile cadence                                                                |
| Before technical handover     | Consolidate current architecture, remove verified obsolete scaffolding, document fork maintenance and resolve SwiftPM identity warning                      | A second engineer can build, test, debug and explain the active paths                                                            |
| Before acquisition acceptance | Verify IP/account ownership, artifact-specific licenses, source/binary provenance, support and rollback responsibilities                                    | Reviewed handover package and account/access transfer evidence                                                                   |

For planning only, allow roughly **4–8 engineer-weeks** for an experienced React Native/iOS engineer with device/signing access to address the observed corrections, targeted tests, release validation and initial structural cleanup. This is a broad judgment, not a task-level estimate or delivery commitment; activities overlap, while Apple setup/review and discoveries during device testing can extend calendar time. Scope authentication/platform expansion separately. Do not start a large refactor before adding regression protection for the identified flows.

## 14. Buyer diligence questions that code cannot answer

- Who owns the first-party code, branding, assets, vendor modifications and any contractor-generated work? Are all relevant assignments available?
- Can another engineer reproduce the exact candidate and access the necessary Expo/Apple/hosting accounts through an appropriate ownership arrangement?
- Which current native functions have passed on which physical iPhone/iOS versions, and where are the immutable artifacts and results retained?
- Are purchases, restores, revoked entitlements, support contacts and final store materials verified for the actual release?
- Who maintains the NIOSSH/Citadel/Swift Crypto adaptations, monitors advisories and handles urgent releases?
- What are actual crash, latency, battery, retention, support-load and revenue measurements? None can be inferred from this repository.

## Appendix A. Reproduction notes

Use the documented supported runtime. This assessment selected the existing Node **24.4.1** installation; the default host Node 20 runtime was unsuitable for the installed SQLite test binary.

```sh
npm test
npm run lint
npm run typecheck
npm run format
npm run release:verify
git diff --check
```

Native checks ran from the cached official Swift container with networking disabled, the native directory mounted at `/work`, host UID/GID, a read-only `/etc/passwd` for `ssh-keygen`, and temporary writable runtime/compiler-cache locations:

```sh
swift test --package-path /work --skip-update --jobs 4
```

Container image identity: `sha256:b51717d2c44d36cb536d57890c9a8cad9b8604dbefcbe094f2ea38cfb4fc3631`. The deprecated `--skip-update` flag and cached dependencies mean this establishes a current-source portable test pass, not an independently clean, network-fetched build from scratch.

The successful external dependency check was `npm audit --json`; local `npm explain shell-quote --offline` established the React Native/devtools dependency path. Advisory databases are time-sensitive; the recorded figures apply to this query and lockfile. No automatic audit fix was run.

For statistics, enumerate `git ls-files -z --cached --others --exclude-standard`, deduplicate and retain existing regular files. Exclude `native/Vendor/`; select the source extensions described in section 3. Classify application paths as `app/`, `src/`, `modules/`, `native/TermforgeNative/` and `native/TermforgeNativeProbe/`; tests as `tests/` and the three native test directories; website as `website/`; remaining matching source as tooling. Count physical lines with `splitlines()` and nonblank lines with `line.strip()`. This prevents vendored cryptographic code and build caches from inflating first-party statistics.

The isolated reproductions transpiled the existing TypeScript modules in memory and called `serverFromDraft`/`createExport` using synthetic, nonsecret values. No test fixtures or application files were modified. The output for the jump-host and timing defects is recorded in F04/F07, so these findings do not depend on retained temporary analysis files.

## Appendix B. Principal evidence locations

- Product and current release scope: [README](README.md), [monetization](docs/monetization.md), [release checklist](docs/release-checklist.md), [testing record](docs/testing.md).
- Security and dependencies: [security design](docs/security.md), [dependency review](docs/dependency-security-review.md), [license review](docs/dependency-licenses.md), [native pins](native/Package.resolved), [provenance checker](scripts/verify-native-security.js).
- Type/static/build configuration: [TypeScript](tsconfig.json), [ESLint](eslint.config.js), [Vitest](vitest.config.ts), [CI](.github/workflows/ci.yml), [scripts](package.json).
- Primary maintenance hotspots: [terminal screen](app/terminal.tsx), [native implementation](native/TermforgeNative/TermforgeNativeModule.swift), [workspace screen](app/workspaces.tsx).
- Confirmed data-flow defects: [server draft mapping](src/servers/model.ts), [validation](src/validation/domain.ts), [server persistence](src/servers/repository.ts), [portable configuration](src/storage/export.ts).
- Security boundaries: [host trust](native/TermforgeNative/TermforgeHostTrust.swift), [app lock](native/TermforgeNative/TermforgeAppLock.swift), [file access](native/TermforgeNative/TermforgeFileAccess.swift), [output admission](native/TermforgeNative/TermforgeOutputGate.swift), [purchase service](native/TermforgeNative/TermforgeAccessService.swift).
- Test evidence: [SQLite integration](tests/sqlite.integration.test.ts), [security cases](tests/security-review.test.ts), [access/source-wiring cases](tests/access.test.ts), [native test manifest](native/Package.swift).

**Final technical opinion:** this is a worthwhile product foundation with substantive security engineering, but important user-facing integrations and release assurance remain unfinished. It can become maintainable and commercially credible through focused corrective work. Present it to a buyer as a promising prelaunch asset with transparent technical liabilities, not as an already certified, comprehensively tested or frictionless-to-extend platform.
