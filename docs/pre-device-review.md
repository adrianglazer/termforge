# Code review before device testing

Reviewed 2026-10-08. This is a code review and automated-test result, not an iOS runtime or visual certification.

## Coverage

- Navigation: home, Search, server creation/editing, keys, workspaces, snippets, known hosts, history, import/export, access/purchases and purchase-information pages. Retained Settings and onboarding routes were also inspected.
- Layout: shared scrolling headers, keyboard-aware forms, bottom safe areas, wrapping action rows, readable workspace names and pane layouts.
- Connections: saved profiles, password and Ed25519 authentication, single password jump host, host-identity inspection/approval, cancellation, managed-session lifecycle and terminal controls.
- Remote work: directory browsing, file actions, transfers, text editing, snippet preparation/submission and port forwarding.
- Storage and access: repository operations, configuration serialization/import, trial/lifetime state and purchase-route reachability.

## Fixes from this review

- Reused one touch-button component across workspace, snippet, server, key, known-host, configuration and purchase actions.
- Added keyboard handling to server forms and bottom safe areas to ordinary screens; Files and the editor now account for the bottom inset too.
- Wrapped terminal action groups to reduce overflow on narrow screens. Forwards selected from Files now opens the forwarding panel.
- Blocked deletion of servers still used as jump hosts or active workspace connections. Successful deletion clears workspace assignments transactionally, preserving the pane layout.
- Preserved workspace forwarding controls when reopening a live terminal and retained session metadata when a disconnect fails, allowing a retry.
- Kept unsaved workspace names after failed saves and prevented overlapping layout saves.
- Added disconnected-file draft copy/export recovery while the current screen remains mounted and confirmation before discarding edits.
- Added Copy export, explained import replacement behavior, and refreshed the app theme after changing/importing preferences.
- Kept Access & purchases reachable from More tools after lifetime access removes the banner.
- Removed editable server options that the native implementation ignores. Existing stored values remain preserved; the form describes the actual behavior.

## Known limitations

- Native connections use a fixed 15-second network timeout and xterm-256color. Saved timeout, keepalive, terminal-type, startup-command and reconnect preferences are not implemented as configurable connection behavior. Retry only covers eligible initial connection failures; established sessions are not automatically restored.
- Jump connections require password authentication for both the destination and the single jump host. Chained jumps and key authentication through a jump host are unsupported.
- Backgrounding closes sessions. An unsaved editor buffer can be copied/exported after connection loss while its screen remains mounted; it is not a durable draft across app locking, unmounting or restart.
- Purchase-information text still contains operator/legal/contact placeholders. These need final owner-supplied content before App Store submission.

## Automated validation

98 tests in 18 suites pass, including real SQLite tests, session lifecycle, trust/authentication boundaries, SFTP/editor controllers, snippets, purchases and navigation reachability. Full TypeScript checking, ESLint and formatting checks pass. No native iOS build or device run was performed during this review.

## Suggested device pass

1. Create a password server, connect, disconnect and reconnect; repeat with a saved key and Face ID. Confirm remembered trust does not prompt again and a changed server key is rejected.
2. Create a key from the server form and return with it selected. Test authentication cancellation and retry.
3. Create/split/rename a workspace, open both connections, return and reopen them. Add a forward, return to the workspace and verify its Stop control remains available.
4. Prepare a snippet with variables, choose a saved server and run it explicitly. Verify blank variables are rejected.
5. Browse several directories, navigate Up, rename a test file, upload/download and edit it. Test save failure, connection loss and local draft export.
6. Check all screens with the keyboard shown/hidden, landscape orientation and larger text. Verify the terminal key strip still scrolls and clears the home indicator.
7. Test purchase, restore, cancellation and trial expiry using Apple's test environment. Confirm saved local data remains accessible.
8. Copy an export, import it, reassign imported SSH keys and connect. Check server deletion leaves workspace panes usable.
