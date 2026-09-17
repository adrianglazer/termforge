# Task 04 native verification record

Date: 2026-09-17

## Local evidence

- `npm run typecheck`, `npm run lint`, `npm run format`, `npm test`, and `git diff --check`
  pass. The local suite has 34 checks.
- The iOS JavaScript bundle exported successfully with Metro. This validates JavaScript module
  resolution and routing, not Swift/UIKit compilation or native runtime behavior.
- The disposable Docker SSH fixture validated host-side SSH/SFTP protocol behavior, including
  forwarding, bastion routing, host-key rotation, and transfer file operations. It does not invoke
  the iOS native bridge.
- This host is Linux and has no `swiftc`, Xcode, iOS simulator, or signed iPhone binary. Native
  Keychain, UIKit terminal rendering, Citadel calls, Files/share permissions, and actual native
  transfer cancellation cannot be established here.

## Shared candidate/device milestone

Per `tasks/README.md`, these are pending for the single shared release-candidate session after
tasks 04–07. They are not EAS Task 4 completion criteria and must not trigger a task-specific
development, preview, or TestFlight build.

1. Compile and install the consolidated signed candidate; record the source revision, build ID,
   device, and iOS version.
2. Smoke changed native paths once: key protection/import/export, known-host review, representative
   SSH/SFTP/editor/forwarding path, and Files/share permissions.
3. Check real lifecycle handling: temporary Control Center interruption, background/foreground,
   and one interrupted native connection or transfer recovery.
4. Check physical terminal behavior: portrait/landscape, keyboard occlusion, Unicode composer,
   selection/clipboard, PTY resize, VoiceOver/Dynamic Type, and one bounded four-session plus
   transfer workload.

## Explicit limitation

The native bridge currently has no callable operation to abort an already-running transfer. Local
controller tests verify cancellation state and suppress late completion results, but only a future
native implementation plus shared-candidate smoke can prove true transfer abort behavior.
