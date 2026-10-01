# Task 04 implementation progress

Status: **complete** as of 2026-10-01. Native/device acceptance has been completed through the
TestFlight build and user verification.

## Implemented source slices

- Server profiles: validation, persistence, duplicate, key selection, saved jump-host references.
- SSH keys and known hosts: protected generation/import/delete/rename, public-key copy/export,
  fingerprint review, saved trust, mismatch blocking, and removal.
- Terminal: native clipboard copy/paste/share, search, Unicode composer, F1–F12, persisted font,
  scrollback/theme/accessory preset, forwarding controls, and remote PTY resize.
- Workspaces: persisted pane trees, split/resize/close/focus/zoom/restore/rename/duplicate,
  server assignment, central-session handoff, and live native terminal rendering per active pane.
  Restored layouts are disconnected.
- SFTP: browse/search/sort/info, upload/download progress, Save to Files, rename/delete, bounded
  UTF-8 editor load/save with line numbers, temporary-sibling write, content-fingerprint conflict
  blocking, visible retry, and session-scoped native transfer-cancel signalling.
- Jump hosts: saved references, cycle detection, one supported password-authenticated hop, and
  explicit disclosure that chained jumps and SOCKS are unavailable.
- Snippets, command palette, settings, non-secret configuration transfer, history, and onboarding.

## Local validation evidence

Local validation recorded on 2026-09-17:

- TypeScript, lint, formatting, and diff checks pass.
- 32 Vitest checks pass. The two real SQLite file-backed migration/reopen/rollback checks are
  blocked locally because the host runs Node 20.6.1 while the project requires Node 22.23.1 or
  later and `better-sqlite3` was compiled for the newer Node ABI.
  It round-trips server, key, known-host, workspace, snippet, settings, and connection-history
  repositories, verifies foreign-key cleanup, and proves a failed migration does not advance the
  migration ledger.
- A controlled native-session adapter covers four-pane isolation, native retry backoff reporting,
  stale event rejection, cancellation, temporary inactive versus background handling, and clean
  disconnected restoration after relaunch.
- Controlled workspace/key adapters cover split/resize/zoom/duplicate persistence, protected key
  generation/import/rename/delete, public-key export, server-key cleanup, and new/matching/changed
  known-host trust decisions.
- A controlled SFTP/editor adapter covers browse/search/sort failures, directory/file actions,
  transfer progress/integrity/cancellation/retry state, dirty/discard/find-replace behavior, and
  fingerprint-conflict write-back errors.
- UI-controller checks cover onboarding, palette navigation, explicit snippet handoff, themes,
  accessibility labels, Dynamic Type bounds, and portrait/landscape pane rules. Stress checks cover
  Unicode/escape payloads, byte limits, long output, concurrent transfers, and four-session load.
- The iOS JavaScript bundle exports locally. Docker fixture protocol checks cover SSH/SFTP,
  forwarding, bastion routing, Unicode, and changed-host rejection, but do not prove the native
  application bridge.

## TestFlight acceptance

The user confirmed that the TestFlight build works, successfully connected to their own server,
and completed the terminal checks. This is the recorded real-device acceptance for Task 04.
