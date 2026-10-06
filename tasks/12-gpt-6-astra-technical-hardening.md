# 12 — GPT-6 Astra: technical hardening without feature changes

**Assigned model:** **GPT-6 Astra** (`gpt-6-astra`)  
**Reasoning effort:** **extra high** (`xhigh`)  
**Status:** specification only; implementation not started  
**Input assessment:** [Technical due diligence, 6 October 2026](../TECHNICAL_DUE_DILIGENCE.md)

Use one accountable implementation owner for this task. Astra is selected for the cross-language reasoning required to preserve authentication, file integrity, concurrency and native/JavaScript contracts during corrective work. This is an engineering recommendation, not a claim that a model guarantees correctness. The model and reasoning setting are supported by the current environment and the [official model documentation](https://developers.openai.com/api/docs/models/gpt-6-astra), checked on 6 October 2026.

**Execute this specification only when explicitly asked. Creating this file does not authorize starting implementation, another chat, a cloud build, deployment or submission.** This task is self-contained: its executor must not require access to the conversation that produced it.

## Objective

Address the most consequential actionable risks in the technical assessment while retaining Termforge's existing feature set, product design and security policies. Deliver safer existing operations, focused production modules, meaningful regression coverage, stronger local/CI checks and an accurate maintenance handover.

Do not turn this into a feature-completion project or a rewrite. Success is demonstrated by specific closed findings and reproducible evidence, not a higher subjective score, a target number of tests or a cosmetic reduction in file length.

### Meaning of “no feature changes”

Preserve all existing supported capabilities, screens, routes, controls, navigation, appearance, commercial terms, supported platforms, resource limits and normal successful workflows. Do not add, remove, hide or redesign features.

The only intended behavior corrections are the defects explicitly scoped below: protecting remote-file metadata, honoring an edited jump-host selection, applying an existing split-ratio control, cleaning up sessions owned by deleted panes/workspaces, rejecting invalid/dangling metadata mutations, and accurately reflecting existing forwarding outcomes. These repair existing operations; they do not authorize adjacent product changes. Use existing error/status surfaces for necessary failure feedback.

If a proposed fix would introduce a capability, materially change a valid workflow or require an unspecified product decision, document that portion as deferred and continue independent in-scope work. Do not silently reinterpret the restriction to finish every finding in the report.

## Required context and starting point

Read before editing:

1. [Task execution and milestone-build policy](README.md) and [repository instructions](../.codex/AGENTS.md).
2. [Technical due diligence](../TECHNICAL_DUE_DILIGENCE.md), especially F01–F11 and its evidence limitations.
3. [Security boundaries](../docs/security.md), [testing evidence](../docs/testing.md), [troubleshooting](../docs/troubleshooting.md), [release checklist](../docs/release-checklist.md), and [monetization](../docs/monetization.md).
4. [Dependency review](../docs/dependency-security-review.md), [native package manifest](../native/Package.swift), [native pins](../native/Package.resolved), the vendor provenance files and current CI/release scripts.
5. The actual production paths listed below. Treat older architecture/task documents as historical where they disagree with current source.

The report's closing baseline was **78 JavaScript tests and 23 portable Swift tests passing**, with a full npm audit reporting **29 affected package entries across seven distinct advisories**. These are historical inputs, not acceptance results for this task. The baseline involved uncommitted work and concurrent changes; inspect the current checkout and rerun applicable checks. Do not reproduce old counts by deleting tests or ignoring new files.

The latest recorded startup correction introduced `src/security/startup.ts` and `src/persistence/startupError.ts`. It addresses a proposed lifecycle cause of a tester-reported protected-storage startup failure. Preserve that work; local success still does not prove the installed iPhone issue is fixed. Build 4 predates later native/purchase changes and cannot validate them.

Record initial revision, working-tree status and source identity in the execution record. Preserve unrelated changes and generated artifacts. Do not reset, stash, rewrite history or overwrite another task's work. If the checkout changes during execution, reassess only affected paths and identify which source snapshot each check covered.

## Scope and priority

| Assessment finding                                                | Task 12 treatment                                                                                      | Priority                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| F03 — remote editor metadata and replacement integrity            | Correct and verify the existing save operation without adding an editor feature or changing its limits | First                                        |
| F09 — dependency advisories                                       | Reassess actual exposure and apply compatible, focused fixes                                           | First                                        |
| F06/F07 — session ownership and metadata consistency              | Correct the specified cleanup/validation defects with deterministic and real-SQLite tests              | First                                        |
| F04/F05/F08 — jump edit, split geometry, forwarding state         | Repair existing controls and feedback; preserve UI design and supported modes                          | Next                                         |
| F10 — incomplete automated assurance                              | Add production-path regressions, portable native CI and appropriate static checks                      | Throughout                                   |
| F11 — concentrated implementation and unclear active architecture | Incremental extraction, contract clarification and current maintenance documentation                   | After regression protection                  |
| F01 — current Apple/startup/purchase acceptance                   | Preserve corrections, run available local checks, and prepare exact outstanding milestone checks       | Evidence/handoff; no independent cloud build |
| F02 — connection settings disconnected from native behavior       | Reconfirm and document; implementation is explicitly deferred                                          | Outside behavior-change scope                |

**F02 must remain visible as unresolved.** Do not activate startup commands/environment propagation, implement post-disconnection reconnection or keepalive behavior, change transport timing/terminal negotiation, or hide/remove existing controls under this task. Those changes need their own explicitly authorized behavior specification. Do not mark F02 fixed because options were moved into a typed object or a characterization test was added.

## Invariants

- Keep password/private-key/passphrase material native. Retain secure prompts, Keychain protections, one-use host challenges and actual peer verification before credentials. Never accept a changed host automatically or downgrade authentication to obtain a passing test.
- Preserve lock/privacy-cover behavior, foreground/background distinctions, protected SQLite coordination, picker-issued file capabilities and backup exclusions. No reset/reinstall recommendation or database deletion as a fix for startup.
- Preserve current native access enforcement and purchase rules: explicit original-acquisition seven-day trial, US $14.99 base-price lifetime unlock, localized Apple pricing, restore behavior and no automatic charge. No test bypass or entitlement granted from JS/SQLite flags.
- Keep terminal output native, limits and cancellation bounds intact, and unsupported authentication/platform/forwarding modes unsupported.
- Preserve existing data, identifiers, export version, public bridge names and event payload compatibility unless an additive internal contract is strictly required for the specified fixes. Any necessary schema migration must be forward-only, transactional and tested with an existing database; never edit an already-applied migration to simulate an upgrade.
- Keep the stack and package-manager workflow. The repository has a pnpm preference but an npm lockfile and npm-based CI/EAS; do not introduce a second lockfile or migrate package managers as part of hardening.
- No new runtime dependency, framework, backend, analytics, licensing service, account system, theme redesign, website change or app-store material change. Follow repository approval requirements for any genuinely necessary new development dependency; finish the dependency-free work first.

## Work package A — baseline and regression harness

1. Use a supported Node runtime; the review used the existing Node 24.4.1 installation. Record Node/npm/Swift versions and native tool availability. Distinguish missing tools or incompatible SQLite bindings from application failures.
2. Run current relevant tests/checks before changes and record pre-existing failures. Reproduce each scoped finding against current source; if another task already fixed it, verify its coverage instead of implementing a competing fix.
3. Add focused regressions at the actual application/controller/native boundary. A copied algorithm or assertion that a function name exists in source is not behavioral proof. Use dependency injection where necessary to exercise the production implementation.
4. Keep characterization tests for behavior that must be preserved distinct from regression tests for the allowed defects. Do not institutionalize F02 as desired behavior; label it a deferred limitation.
5. Use disposable fixture data/keys and local loopback services only. Never execute tests against a saved personal host or real remote file. Test failures must not print credentials, private paths, terminal contents or raw native exceptions.

## Work package B — remote editor integrity (F03)

Inspect the actual SFTP implementation in `TermforgeNativeModule.swift`, the pinned Citadel API and existing editor tests before changing it. Extract the production save operation into a focused native unit if this makes it executable in the portable integration harness; do not write a separate test-only save implementation.

Required properties:

- Continue saving bounded UTF-8 text through the current editor action and preserve fingerprint conflict detection.
- Read and preserve the original permission mode and supported ownership metadata needed to keep the replacement no less private and no less executable than the original. Define precisely what can be preserved on the supported server/API; do not claim preservation of ACLs, extended attributes, links or ownership when it is unverified.
- Stage replacement content with restrictive permissions before writing sensitive bytes. Do not create a broadly readable temporary file and tighten it only after the exposure. Apply/verify required attributes before discarding the old file.
- Avoid following an unexpected symlink or overwriting an unrelated temporary path. Use uniquely owned staging artifacts and appropriate exclusive creation where supported. Preserve existing remote-path validation.
- On unsupported required metadata or an unsafe replacement condition, fail through the existing safe error surface without replacing the original. Do not silently broaden access or invent a new editor/recovery screen.
- Cover failure before staging, during write, between replacement steps and during cleanup. Never delete the last known intact copy. Retain recoverable backup state when rollback cannot complete and document the existing-operation recovery procedure using redacted diagnostics.
- Preserve cancellation, lock, expiry and session-generation admission at remote side-effect boundaries. A refactor must not move authorization solely to the UI or leave an operation running after teardown.
- Recheck concurrency limitations near commit, but do not call a two-rename protocol an atomic compare-and-swap. State residual races honestly when the protocol/server cannot eliminate them. Do not add a remote agent or unapproved server extension to solve them.

Required evidence: exercise the production save path against a disposable SFTP fixture with `0600`, `0644` and `0755` files; confirm bytes and resulting mode. Include conflict, server permission denial, interrupted commit and cleanup failure. Use deterministic injected failure points for hard-to-trigger ordering, together with real SFTP success/permission cases. Host command-line SFTP tests alone validate the fixture, not this implementation.

If the required native integration cannot execute locally, complete portable tests and identify the exact Apple/fixture gap. Do not mark F03 fully verified from mocks alone.

## Work package C — existing data and session operations (F04/F06/F07)

### Server edits and validation

- Make the edited draft authoritative for setting, changing and clearing `jumpServerId`. Remove the stale-existing-value override. Reuse one mapping path from the actual server screen rather than maintaining competing mappings.
- Preserve the jump-host selection when duplicating a profile, alongside its other supported metadata; do not copy secret material or invent a new credential policy.
- Reuse bounded runtime validation for local edits, repository writes and import/export: finite integers and the existing import ranges for timeout/keepalive, valid endpoints and existing authentication constraints. Do not activate those stored settings in the transport; F02 remains deferred.
- Invalid input must fail before partial persistence. Do not silently clamp or rewrite existing records to make export succeed. For legacy-invalid records, preserve data and provide a safe actionable failure through existing surfaces.

### Reference integrity

- Prevent deletion of a server that is still referenced by another profile or saved workspace. Use the existing error surface to explain that references must be removed first. This task chooses conservative rejection, not silent detachment, cascading workspace destruction or a new deletion dialog/workflow.
- Check references and mutate within an appropriate serialized/exclusive transaction. Validate the resulting whole relationship graph, including merged imports, not only the imported subset.
- Keep key-deletion recovery and connection-history semantics intact. Do not assume enabling `PRAGMA foreign_keys` protects references stored in JSON.
- Verify real SQLite create/edit/delete/import/export/reopen and rollback behavior. Every newly accepted metadata mutation must leave valid, exportable data. Cover missing referenced records and ensure a failed operation leaves the prior database unchanged.

### Session ownership

- Closing a pane or deleting a workspace must close sessions owned by the removed panes through the existing session manager/native teardown path. Do not close another workspace's sessions or unrelated standalone terminals.
- Coordinate asynchronous close and persistence so failure leaves a recoverable UI/model state. Keep close idempotent and do not report teardown complete while relevant owned work remains admitted.
- Prevent concurrent duplicate session creation for one pane. Reuse/reject the existing connection through the established flow rather than silently replacing a live session or introducing automatic reconnect behavior.
- Test duplicate clicks, close during connect, close failure, deletion with active forwards/transfers, late events and teardown of exactly the affected session IDs. Respect the intentional distinction between view unmount/detach and explicit pane/workspace deletion.

## Work package D — existing presentation and event wiring (F05/F08)

### Pane dimensions

- Apply the stored split ratio to actual child layout constraints for both existing axes, including nested splits and the existing narrow-screen axis adaptation.
- Retain current controls, layout vocabulary, min-size behavior, focus and navigation. No drag-resize feature, visual redesign or new workspace model.
- Verify that changing the existing percentage changes measurable child allocation, persists and restores, and causes the expected native viewport/PTY resize without replacing the session. A pane-tree calculation alone is insufficient evidence that the renderer uses it.
- Add a rendered/native layout check where supported. If a renderer dependency is unavailable, test the production layout-prop mapping and keep actual rendering explicitly pending for the shared candidate; do not label that substitute a rendered UI test.

### Forward status

- Add the missing typed `onForwardState` contract and reconcile the native outcome into existing forwarding UI. Keep pending, successful, failed and stopped states accurate using the existing list/error surfaces; do not add new forwarding modes or a dashboard.
- Match session/generation/sequence and operation identity. Handle an event arriving before the start promise resolves, duplicate events, stale events from a prior session and disconnect/expiry while negotiation is pending.
- Do not equate a returned reservation ID with an accepted remote forward. Clear stale rows after teardown and retain a safe error when a server rejects the request.
- Test asynchronous rejection, readiness, stop, repeated start/stop and session replacement through the production adapter/controller. Preserve native cancellation deadlines and channel caps.

## Work package E — dependency and build assurance (F09/F10)

### Dependency remediation

Reassess the current lockfile and official advisories at execution time. The report identified `shell-quote` 1.10.0 through React Native/devtools, Vitest 4.0.16 and `@vitest/mocker`; reviewed candidate fixes were shell-quote 1.11.0 and Vitest 4.1.11. These are starting points, not instructions to force stale versions or trust scanner suggestions without compatibility checks.

- Prefer compatible updates of existing dependencies and minimal lockfile churn. Preserve the supported Expo/React Native/native graph. No major SDK migration, downgrade, forced peer resolution or broad `audit fix --force`.
- Distinguish mobile runtime, build tooling, test tooling and website image exposure. Separate unique advisories from propagated package-entry counts, and registry severity from demonstrated application reachability.
- Do not suppress advisories or change manifests merely to produce a green number. Record unresolved cases with component/version, reachable path, mitigation, owner role, next review condition and residual risk.
- Keep native fork revisions, patches, licenses and provenance auditable. Address the reported SwiftPM duplicate Swift Crypto identity warning only with a narrow packaging correction that preserves the reviewed implementation and excludes `_CryptoExtras`. Do not edit vendored cryptography or regenerate hashes without reviewing and explaining every changed file.
- If a scan is unavailable or approval is denied, preserve earlier evidence with its date/scope, record the exact missing check and continue local work. Never bypass a denied external query with an indirect route or describe it as a clean audit.

### Automated quality gates

- Add portable Swift tests to CI with a documented supported toolchain, dependency caching and bounded execution. Dependency fetching and tests must be distinguishable; after resolution, use local fixtures/loopback for tests rather than public SSH hosts.
- Keep JavaScript tests, lint, typecheck, formatting, provenance, bounded secret scan and whitespace checks. Add a checked-in runtime selector aligned with the validated CI runtime; do not introduce machine-specific absolute paths into project configuration.
- Enable useful React Hooks checks and type-aware promise handling using existing compatible tooling where available. Review new warnings; avoid blanket disables or suppressions added simply to pass. Keep unrelated changes out of the cleanup.
- Establish a reproducible Swift formatting check for touched first-party code where tooling is available. Exclude vendor/generated files. Do not reformat the entire repository or claim a native static analyzer ran when only syntax parsing ran.
- Add coverage reporting only if a compatible provider is already available or approved. State exactly what is measured; do not require an arbitrary global percentage, exclude hard-to-test production files to inflate it, or turn unavailable coverage into zero coverage.
- Retain read-only CI permissions and avoid credentials in untrusted pull-request execution. Do not modify remote branch protection/account settings. Do not add per-push EAS builds or automatic releases.

## Work package F — incremental maintainability improvements (F11)

Refactor after the relevant behavior is protected. Separate extraction changes from defect corrections in reviewable steps; validate each affected boundary before moving on.

1. **Terminal screen:** extract connection/trust orchestration, file/editor operations and forwarding reconciliation into focused hooks/controllers/components using existing adapters. The route should compose those responsibilities and retain presentation/navigation. Avoid a replacement global store or generic plugin framework.
2. **Native module:** separate session ownership/lifecycle and SFTP/editor operations from Expo module definitions. Keep credential/trust/access authorities singular; preserve actor isolation, event-loop ownership, error mapping, queue ordering and cancellation. Extract further key operations only where this removes a genuine independent responsibility.
3. **Bridge contracts:** centralize connection option and event types without changing wire compatibility or enabling deferred settings. Use the same contracts in real callers and tests. Native runtime validation remains necessary despite TypeScript declarations.
4. **Old scaffolding:** trace imports, Expo discovery, pod registration, config plugins, build scripts and tests before removing unused contracts/modules/dependencies. No “unused” conclusion from TS imports alone. Where registration cannot be proved, document the legacy path and leave it intact for now.
5. **Documentation:** provide one current architecture map identifying active entry points, service responsibilities, resource ownership and test locations. Preserve historical task records and the original diligence report; link a dated follow-up rather than silently rewriting earlier findings as if they never existed.

Prefer cohesive files around the repository's ~300-line guidance; examine files above ~500 lines. Do not split solely to meet a number, move the entire monolith unchanged into another directory, or hide complexity behind forwarding wrappers. Record before/after sizes of the two hotspots and explain the responsibilities removed from each. Any remaining very large unit needs a concrete cohesion/risk explanation.

## Validation and milestone handoff

Run targeted tests during changes, then the applicable final baseline:

```sh
npm test
npm run lint
npm run typecheck
npm run format
npm run release:verify
git diff --check
swift test --package-path native --jobs 4
```

Use the existing supported container/runtime if Swift is not installed locally. Verify source identity before and after the checks. Run changed production-path integration tests in addition to this baseline; passing these commands does not automatically satisfy the acceptance criteria above. Validate new documentation/task files separately if current formatting globs omit them.

When native files are moved or dependencies/configuration change, validate Expo module discovery, package pins, provenance and generated build wiring in a disposable/isolated generated output location. Use available local Apple tooling for compilation where possible. Portable Swift tests and syntax parsing cannot establish UIKit, StoreKit, Keychain or Expo Apple API compatibility.

Follow the shared build budget in `tasks/README.md`. Prepare one consolidated task 08 handoff with:

- Exact revision plus dirty-tree source identity, changed native boundaries and local checks.
- Pending startup launch/unlock/background recovery on the corrected candidate.
- Only changed editor, pane sizing, forwarding/session teardown, keyboard/safe-area and purchase/access interactions that still require Apple/device proof.
- For each pending check: why local evidence is insufficient, the precise expected outcome and the artifact/device/OS identifiers to record.

This task does not independently trigger EAS builds, consume a new signing/distribution milestone, upload TestFlight builds, configure Apple products, deploy the website or submit publicly. Reuse compatible historical evidence only for unchanged paths. In-scope local/code work may complete while Apple evidence remains pending; production readiness may not.

## Deliverables

1. Focused code corrections and extractions within the stated scope, with meaningful regression tests and appropriate CI/configuration changes.
2. `docs/task-12-hardening.md` containing the baseline/current source identities, finding dispositions, implementation locations, before/after hotspot sizes, test commands/results, dependency outcomes, compatibility review and outstanding gates.
3. Updated current architecture/development/testing/security/dependency documentation only where this task changes facts or procedures; preserve earlier evidence and avoid duplicating long checklists.
4. A concise task 08 release handoff and maintenance instructions for the active native graph. Do not claim legal compliance, production performance or independent handover from repository checks alone.
5. An execution record appended to this task stating completed, partially verified, blocked and explicitly deferred work. Leave the initial specification distinguishable from that record.

Use this disposition table in the handover:

| Finding               | Current reproduction                                         | Change and production path                 | Executed evidence                     | Residual limitation / release gate | Status                                                                                |
| --------------------- | ------------------------------------------------------------ | ------------------------------------------ | ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| F01–F11, one row each | Reproduced / already corrected / not reproduced, with reason | Exact files/functions or explicit deferral | Tests and results, not planned checks | Owner role and next action         | Fixed and locally verified / awaiting Apple evidence / unresolved / deferred by scope |

## Definition of done

- [ ] The feature set, product design, security/access policies, limits and commercial terms are unchanged; every intentional behavior correction maps to the explicit list in this task.
- [ ] F03 and F04–F08 are corrected and meaningfully tested, or a specific unresolved blocker is recorded without marking that work complete. Missing native execution is clearly distinguished from an implemented fix.
- [ ] F09 has current evidence or precisely dated/limited fallback evidence, compatible remediations where possible, and explicit residual dispositions. No clean-audit claim based on selective scanning.
- [ ] Portable native CI and applicable static/regression checks run, or unavailable tooling is an explicit outstanding deliverable rather than an implied pass.
- [ ] The two maintenance hotspots have focused responsibilities extracted without parallel implementations, weakened boundaries or unverified module discovery.
- [ ] Data compatibility, real SQLite rollback/reopen, unchanged successful workflows and sensitive native ownership/cancellation behavior are covered at the relevant boundaries.
- [ ] Current architecture and maintenance instructions match the code. No generated/vendor changes or unrelated edits are hidden in the patch.
- [ ] F01's remaining device/purchase/startup gates and **F02's deferred connection behavior** remain visible. Neither is closed merely because the local suite is green.
- [ ] The handover records actual commands, results, source identity, remaining risks and the next consolidated-candidate checks. No build, deployment or external account changes were made as an incidental part of this task.

**Completion language:** use “Task 12 local/code scope complete; listed release gates remain pending” only when the scoped implementation and local evidence are actually complete. Otherwise state the specific unfinished work. Never equate task completion with a certified secure, fully standards-compliant or release-ready product.
