# Task 04 handoff

Date: 2026-09-16

Task 03 is implementation-complete and accepted by the user for the tested
development-build scope. Start Task 04 from `tasks/04-gpt-5.6-terra-workstation.md`
and reuse the existing native services. Do not replace them with mocks.

## Device acceptance recorded

Device: iPhone 13 running iOS 26.6.1.

The user confirmed:

- native package loading;
- protected key generation, authenticated use, and deletion;
- encrypted Ed25519 key use;
- host inspection/approval and password SSH connection;
- interactive command input/output;
- terminal responsiveness;
- emoji, vim, and htop;
- disconnect/reconnect;
- SFTP browsing, upload, and download.

The user accepted the terminal-command and SFTP scope and waived repeating
missed cases. This is user acceptance, not evidence that every individual
section 85/86 case, forwarding mode, and bastion path was executed.

## Native implementation available

- SwiftTerm 1.19.0 terminal view with bounded scrollback, resize integration,
  title/bell handling, search, clear history, font sizing, six themes, and a
  semantic mobile key bar.
- Citadel 0.12.1 SSH with host-key inspection/pinning, password and protected
  Ed25519 authentication, typed lifecycle failures, timeout, and bounded retry.
- Keychain-backed protected key generation/import/deletion with opaque
  references and encrypted OpenSSH Ed25519 import.
- Native SFTP listing and bounded upload/download with progress, cancellation,
  temporary-file cleanup, path validation, and incremental SHA-256 results.
- Password jump-host support, loopback local forwarding, and loopback-only
  remote forwarding. SOCKS is intentionally unsupported.
- Sessions live in the native registry rather than React component state.

## Current source-only fixes awaiting an iPhone build

These changes pass local TypeScript, lint, automated tests, and diff checks but
have not run on the iPhone:

- Control Center's temporary `inactive` state no longer disconnects SSH; an
  actual iOS `background` transition still closes honestly because continuous
  background SSH execution is not promised.
- A bounded Unicode composer sends UTF-8 directly to SSH as a workaround for
  SwiftTerm's broken direct entry of Polish composed characters such as
  `żźłó`. Emoji already worked through direct input.
- SFTP completion dialogs display byte counts and SHA-256 hashes.
- The connected-session header is one compact grey row; the safe-area/notch
  region is black and landscape insets are respected.
- The disposable server's short default password is `test`.

The attempted EAS submission was rejected before build creation because the
Free-plan iOS quota was exhausted. EAS reported a reset date of 2026-10-01, so
there is no build ID for this attempt. Submit a new development build after a
plan upgrade or quota reset, then test the source-only fixes. TestFlight
release-candidate acceptance remains pending and must not be called passed.

## Disposable SSH/SFTP environment

The Docker target and bastion were healthy at handoff.

- LAN host: `192.168.18.4`
- Target SSH/SFTP port: `2222`
- Bastion port: `2223`
- Username: `termforge`
- Password: `test`
- SFTP fixture directory: `/home/termforge/fixtures`
- Expected fixture: `README.txt` (150 bytes)

The LAN address can change after a network or host restart. Scripts and fixture
definitions are under `scripts/` and `tests/ssh-server/`.

## Known limitations and Task 04 work

- SFTP downloads currently remain in the app's temporary sandbox. Task 04 must
  provide an explicit Save to Files/share flow plus the complete local/remote
  browser and editor described by its task file.
- Direct Polish composition inside SwiftTerm remains faulty; retain the Unicode
  composer unless SwiftTerm input itself is repaired and device-tested.
- Full background SSH keepalive is unavailable under ordinary iOS suspension.
  Never display a suspended/dead connection as live; foreground recovery must
  be honest.
- Forwarding and jump-host native APIs exist but need Task 04 controls and
  device workflow acceptance.
- Multi-session/workspace panes, server/key/known-host management screens,
  selection/copy/paste/share controls, snippets, settings, onboarding, history,
  accessibility, and adaptive workstation UI belong to Task 04.
- iPad and hardware-keyboard checks are optional and non-blocking. The product
  target is iPhone.

## Working tree and verification

Task 03 changes are present in the working tree and were not committed during
the handoff. Preserve them when starting Task 04. At handoff, the following all
passed:

- `npm run typecheck`
- `npm run lint`
- `npm test` (5 tests)
- `git diff --check`

Canonical detailed evidence remains in:

- `tasks/03-gpt-5.6-sol-native-integrations.md`
- `docs/terminal-engine.md`
- `docs/ssh.md`
