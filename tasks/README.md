# Task execution: local validation and milestone builds

Read this policy before any numbered task. It supersedes conflicting build/test cadence in older task text, `docs/implementation-plan.md`, architecture/handoff documents, and acceptance lists in `instructions.md`. Product and security requirements still apply. Preserve historical results; do not turn user acceptance or mocked tests into proof of unexecuted native behavior.

## Local first

For every change, run all applicable checks locally before requesting device work. Add meaningful coverage as each feature lands rather than postponing it all to task 05. Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run format`; record failures honestly. Use the project's supported Node version when available and record tooling limitations. Do not fix unrelated work merely to clean up a report.

| Coverage                                                                                                              | Where to validate                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validation, trust decisions, redaction, exports, snippets, settings, pane operations/dimensions                       | Local unit/property tests, including malformed inputs and secret exclusion                                                                         |
| Migrations, repositories, restoration                                                                                 | Local real SQLite migration/reopen/rollback tests plus repository tests; mocked SQL alone does not validate SQL execution                          |
| Session isolation, reconnect/backoff, event ordering, cancellation, temporary inactive vs background handling         | Local service/controller tests with deterministic timers and native events; device only for actual iOS delivery/suspension                         |
| Onboarding, server/key/known-host screens, navigation, editor save/discard, palette, themes, accessibility properties | Local component/controller tests with explicit adapters, layout checks where supported; no claim that mocks prove native behavior                  |
| SSH/auth failures, changed host keys, PTY bytes/resize, SFTP CRUD/integrity/interruption, forwarding/bastions         | Disposable local Docker fixtures and integration tests against the real implementation wherever runnable; host SSH commands validate fixtures only |
| Unicode/escape sequences, long lines, paste/output bounds, concurrent sessions/transfers                              | Local parser/model/fuzz/stress tests and checksum assertions where runnable; physical rendering/performance remains separate                       |
| Native compilation and API compatibility                                                                              | Available local Swift/Apple tooling and source/dependency checks first; Linux cannot prove UIKit/Keychain compilation or behavior                  |

If a harness is missing, implement it in the responsible task. If Apple tooling is unavailable, record the precise native check as pending, continue independent work, and batch it into the milestone. Do not turn an entire locally testable feature suite into a manual device checklist. An available macOS simulator/native runner should absorb checks it can execute; local Xcode is not a prerequisite. Known local failures must be resolved or handed off explicitly as blockers, never marked passed.

## EAS build budget

- The initial native feasibility milestone is already evidenced in task 03. Reuse it and the user's accepted terminal/SFTP results. No repeat proof build is required.
- The next planned build is **one consolidated production/TestFlight release candidate after tasks 04–07**, prepared in task 08. Finish feature work, regression coverage, hardening, and security review first. Tasks 04–07 may complete their local/code scope while candidate-only evidence remains pending; release readiness cannot.
- Do not build per feature, task, native edit, quota reset, or device-check item. Do not separately build development, preview, and production copies of the same milestone. TestFlight upload uses the existing production artifact and is not another build.
- Use an existing compatible development client for JS-only iteration when available; native/dependency/configuration changes require a compatible new binary. Never claim an older binary validates newer native code.
- An extra internal development build is an exception only for a concrete native blocker that prevents meaningful progress and cannot be diagnosed locally or on the existing client. Document the blocker and batch all ready related changes. Otherwise wait for the shared candidate.
- Before any EAS submission, finish applicable local checks, review all pending native changes and known compiler issues together, verify package pins/module registration/build configuration with available tooling, and record the source revision plus any dirty-tree patch identity. Save build ID/profile and results. No automatic CI builds or blind retries. After failure, inspect logs and address all identified causes before one replacement attempt.
- A failed candidate may require a replacement. Reuse unaffected evidence and rerun only affected local checks plus the affected device smoke. The budget is a target, not permission to ship an unverified binary.

## Compact device-only acceptance

Use one physical iPhone and the same signed candidate in one consolidated session. Reuse previously accepted evidence unless implementation changes invalidate it. Keep each check short and record build, phone/OS, result, and remaining issue; no exhaustive repetitions of command matrices, every theme, every file operation, or all pane combinations.

1. **Signed install and OS integration:** launch/offline reopen, metadata persistence in the actual app sandbox, changed Keychain/biometric protection paths, and Files picker/export permissions. Local tests handle data permutations and state logic.
2. **Physical terminal interaction:** portrait/landscape and keyboard occlusion, direct/composed Unicode input and the composer, representative control input, selection/clipboard, and one PTY resize/interactive-tool smoke. Specifically cover changed compact header and keyboard paths; do not rerun every §85 command.
3. **Real iOS lifecycle/network:** Control Center interruption versus actual background/foreground, and one interrupted connection/transfer recovery where native changes affect it. Local tests handle retries, timers, and error permutations.
4. **Native integration gaps:** one representative end-to-end path for changed authentication/SSH/SFTP/forwarding/bastion behavior that cannot run in a local native harness. Check transfer integrity automatically; ask the user only to trigger OS interactions. Do not repeat already accepted unchanged paths.
5. **Physical accessibility/performance:** a brief VoiceOver/focus/Dynamic Type smoke and one combined bounded workload with four sessions, high output, resize, and a transfer. Record responsiveness and available native memory measurements; reuse local stress fixtures. No separate exhaustive performance matrix.

Only include applicable, still-unverified items in the actual device handoff. Each must state why local checks cannot establish it and what changed since prior evidence. iPad, external keyboards, and extra OS/device combinations remain optional and non-blocking. TestFlight validates signed distribution on this same session, not a second full suite. No public App Store submission is implied.
