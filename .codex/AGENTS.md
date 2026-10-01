# AGENTS.md

## Core Principles

- Complete the requested task with the smallest correct change.
- Prefer simple, direct solutions over elaborate abstractions.
- Minimize code changes, file changes, and token usage.
- Do not refactor unrelated code.
- Do not make speculative improvements outside the requested scope.
- Preserve existing architecture and conventions unless they directly block the task.

## Code Structure

- Keep code modular and responsibilities clearly separated.
- Do not create large monolithic files.
- If a file is becoming large or handles multiple responsibilities, split it into focused modules.
- Prefer small, cohesive functions and components.
- Extract reusable logic only when it is actually reused or meaningfully improves clarity.
- Avoid unnecessary abstraction, wrapper layers, factories, helpers, or indirection.
- Prefer composition over large all-purpose classes/components.
- Keep public APIs minimal.

## Implementation

- Inspect existing code before implementing anything.
- Reuse existing utilities, components, types, and patterns before creating new ones.
- Prefer modifying existing code over adding parallel implementations.
- Do not duplicate logic.
- Do not introduce new dependencies unless necessary.
- Do not change public APIs unless required.
- Preserve backward compatibility unless the task explicitly requires otherwise.
- Handle relevant edge cases, but do not engineer for hypothetical requirements.
- Do not add configuration options unless they are needed now.
- Do not leave dead code, commented-out code, placeholders, or TODOs.

## Scope Control

- Implement only what the task requires.
- Do not perform drive-by refactors.
- Do not rename, reformat, or reorganize unrelated code.
- Do not rewrite working code solely for stylistic reasons.
- If a larger refactor would be beneficial but is not necessary, do not do it.
- Keep diffs focused and easy to review.

## Testing & Validation

- Validate the smallest relevant surface first.
- Run targeted tests for changed behavior instead of the entire test suite when sufficient.
- Add or update tests when behavior changes or regression risk justifies it.
- Do not add redundant tests for behavior already adequately covered.
- Fix failures caused by your changes; do not fix unrelated failures.
- Run lint/typecheck/build only when relevant to the changed code or required by the repository.

## Communication

- Be concise.
- Do not narrate routine actions.
- Do not provide long explanations of what you are about to do.
- Do not repeatedly summarize progress.
- Use at most one short sentence for routine progress updates.
- Only explain decisions that are non-obvious, risky, or require user input.
- Do not restate the user's request.
- Final responses should be short: summarize what changed and mention validation performed.
- Avoid tutorials or lengthy explanations unless explicitly requested.

## Decision Making

When multiple implementations are possible, prefer in this order:

1. Smallest correct change.
2. Reuse existing code.
3. Fewest affected files.
4. Least new code.
5. Simplest implementation.
6. Lowest maintenance burden.

Do not optimize for theoretical future requirements.

## Avoid

- Overengineering.
- Premature abstraction.
- Large files with unrelated responsibilities.
- Unnecessary new files.
- Unnecessary dependencies.
- Broad refactors during feature work.
- Duplicate implementations.
- Excessive defensive programming for impossible states.
- Verbose comments explaining obvious code.
- Documentation for self-evident internal implementation details.
- Large planning documents for small tasks.
- Long progress reports.
- Repeated summaries.
- Changes made only because they "might be useful later."

## Before Finishing

Check that:

- The requested behavior is implemented.
- The change is as small as reasonably possible.
- No unrelated code was changed.
- No unnecessary abstraction was introduced.
- Existing project patterns were followed.
- Relevant tests/checks pass.
- No temporary/debug code remains.

Then stop. Do not continue improving unrelated code.

## File Size

- Prefer files below ~300 lines when practical.
- Treat files above ~500 lines as a signal to consider splitting responsibilities.
- Do not split a cohesive file merely to satisfy a line-count target.
- Never create thousand-line implementation files when the functionality can reasonably be divided into focused modules.

# Project-specific instructions

- Package manager: pnpm.
- Run targeted tests with `pnpm vitest <file>`.
- Use existing components from `src/components/ui`.
- Business logic belongs in `src/domain`, not React components.
- API access goes through `src/api`.
- Do not edit generated files.
- Do not introduce dependencies without approval.
