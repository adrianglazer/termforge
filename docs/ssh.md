# SSH, SFTP, and connection lifecycle

Decision: **Citadel 0.12.1** for the task 03 proof. This is a conditional native selection, not a claim of production readiness.

## Evidence and alternatives

Citadel is MIT-licensed and its release history includes remote forwarding and PTY/exec fixes. The selected manifest requires iOS 17 and Swift tools 5.9. It depends on **Wellz26/swift-nio-ssh 0.3.4..<0.4.0**, a fork, plus SwiftNIO >=2.81.0 and Swift Crypto >=3.12.3. Record the complete resolved graph/revisions and transitive notices; never describe the fork as Apple's unmodified library. The dependency/fork audit is a mandatory task 03 gate. [Release](https://github.com/orlandos-nl/Citadel/releases/tag/0.12.1), [manifest](https://raw.githubusercontent.com/orlandos-nl/Citadel/0.12.1/Package.swift), [license](https://raw.githubusercontent.com/orlandos-nl/Citadel/0.12.1/LICENSE).

| Candidate                   | Decision                                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Citadel 0.12.1              | Selected: integrated PTY/SFTP/jumps/forwarding and Swift key handling; fork, parsing, buffering, packaging, and maintenance risks require validation           |
| Apple SwiftNIO SSH directly | Lower-level protocol building blocks; would require more SFTP/key-format/service integration                                                                   |
| libssh2 1.11.1              | Mature alternative with nonblocking SSH/SFTP/forwarding; requires C socket scheduling, crypto backend and iOS packaging, plus separate key-generation handling |

Sources: [Citadel usage](https://github.com/orlandos-nl/Citadel), [SwiftNIO SSH](https://github.com/apple/swift-nio-ssh), [libssh2 capabilities/release](https://libssh2.org/), [libssh2 license](https://libssh2.org/license.html). No alternative is pre-approved as a silent replacement.

## Verified source surface vs required proof

| Capability               | Source evidence / task 03 requirement                                                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shell PTY and resize     | `withPTY`, `TTYStdinWriter.write/changeSize`; keep closure alive until explicit close; verify backpressure and cancellation                           |
| Key authentication       | Ed25519, RSA, P256/P384/P521 entry points; verify supported key formats and negotiated signature algorithms independently                             |
| Encrypted OpenSSH import | Parser includes bcrypt and AES-128/256-CTR; verify normal `ssh-keygen` output, wrong passphrases, and bounded hostile inputs                          |
| Generation               | Swift Crypto generates Ed25519; Citadel's `makeSSHRepresentation` writes an **unencrypted** private key; keep private material inside native Keychain |
| SFTP                     | Client/file APIs; add bounded transfers, cancellation and safe local handles                                                                          |
| Forwarding               | Direct TCP/IP and remote forwarding APIs; verify multiple registrations, teardown and server permissions                                              |
| Bastions                 | `jump(to:)`; independently authenticate and verify each hop                                                                                           |
| SOCKS                    | Application proxy integration remains unverified; optional and unavailable until real tests pass                                                      |

Selected-tag sources: [PTY](https://github.com/orlandos-nl/Citadel/blob/0.12.1/Sources/Citadel/TTY/Client/TTY.swift), [auth methods](https://github.com/orlandos-nl/Citadel/blob/0.12.1/Sources/Citadel/SSHAuthenticationMethod.swift), [key parser/writer](https://github.com/orlandos-nl/Citadel/blob/0.12.1/Sources/Citadel/OpenSSHKey.swift), [remote forwarding](https://github.com/orlandos-nl/Citadel/blob/0.12.1/Sources/Citadel/RemotePortForward/Client/RemotePortForward%2BClient.swift).

Required v1: Ed25519 generation/import, encrypted-key authentication, password authentication, real PTY, SFTP, trust checking, reconnect, local/remote forwarding, and a bastion. RSA/ECDSA formats are exposed only when tested. Do not claim encrypted private-key export or passphrase-setting on generated keys: the selected writer does not provide it. Passphrase protection initially covers imported encrypted keys; generated keys use OS-backed protection. Private-key export is outside v1 scope. If broader generated-key passphrase support is required, reopen this decision; do not invent a key-encryption format.

## Trust and authentication

- Canonical trust identity is logical hostname/IP plus port; lowercase DNS names and normalize bracketed IPv6, without treating DNS-resolved IPs as interchangeable trust identities. Match the public key blob and algorithm, display SHA-256 fingerprints.
- Native host-key validation pauses the handshake before authentication. Unknown keys emit a challenge tied to exact host/port/key/session generation. Approval can apply once or persist before releasing the handshake. Denial, timeout, backgrounding, or stale responses cancel it.
- A changed key ends the connection. Replacement requires an explicit separate known-host action showing old/new fingerprints, then a new connection. Never use `acceptAnything`, auto-replace trust, or retry a mismatch.
- SQLite stores public trust records. Native receives a validated snapshot for the attempt; recheck revision before accepting. Import/export cannot inject trusted hosts.
- Authentication prompts/imports occur natively. Resolve opaque references only after host trust succeeds. Prefer Ed25519 and modern SHA-2/AEAD algorithms; disable DSA, SHA-1 signatures/KEX and legacy ciphers. Do not enable Citadel's `SSHAlgorithms.all`. Verify selected fork defaults and RSA SHA-2 negotiation against OpenSSH.
- No agent forwarding, X11 forwarding, host-based auth, or keyboard-interactive/MFA in the initial capability set. Unsupported auth gets an actionable error rather than a password downgrade.

## Lifecycle

Native state: `DISCONNECTED → CONNECTING → CONNECTED → DISCONNECTING → DISCONNECTED`; failures enter `FAILED`. `RECONNECTING` represents a bounded retry cycle. Connecting substates include transport, trust, auth, and PTY; a terminal is connected only after shell/PTY succeeds. SFTP-only sessions report their actual service readiness separately.

One independent connection per terminal initially; SFTP/forward services have explicit ownership of their channels. Close a transport only when its owned services are closed. Use one native session generation per attempt, deadlines/cancellation for every operation, and no implicit library reconnect alongside the application policy.

Defaults: 15-second connection timeout (excluding a separately bounded user prompt), 30-second keepalive, five reconnect attempts with exponential delay starting at 1 second, capped at 30 seconds with jitter. Retry only transient transport loss while foregrounded/unlocked. Authentication, trust, unsupported algorithms, and cancellation require user action. Reset the retry budget only after a stable connection, not every brief success.

On backgrounding: hide sensitive UI, cancel prompts/new authentication, persist non-secret layout, stop listeners/transfers and close connections during bounded cleanup. On return, show disconnected and reconnect according to policy after unlock. No background-mode entitlement is justified for perpetual SSH. Do not replay input, snippets, startup commands, or editor writes automatically after reconnect; remote tmux may preserve work independently.

## Files and tunnels

- Native picker handles authorize specific local files/directories; remote paths never become local URLs. Validate local containment after resolving symlinks and reject separator/NUL/traversal names. Remote POSIX navigation may use parents legitimately; do not confuse it with local containment rules.
- Transfers stream bounded chunks to temporary files; replace destinations only after completion and explicit overwrite choice. Interrupted upload/download remains visibly incomplete. Retrying/resuming requires verifying the remote file/version; no blind append.
- Editor starts with UTF-8 text limited to 2 MiB, rejects binary/oversize content, and keeps plaintext out of diagnostics. Compare size/mtime and a content hash where feasible before save; conflicts require user choice. Prefer temporary sibling upload + supported atomic rename; do not promise atomicity when server extensions are absent. Preserve permissions where possible.
- Local listeners bind loopback by default; remote forwarding requests remote loopback. Validate ports, endpoints and conflicts, cap active channels, and require explicit starts. No automatic restoration of active tunnels. SOCKS, if implemented, is loopback-only and sends hostname resolution through the remote side.
- Bastion chains must be acyclic and capped at three hops initially. Each hop has independent trust and credentials. Target SSH performs its own handshake inside the forwarded channel. Failure tears down owned descendants without affecting unrelated sessions.

## Task 03 implementation status — 2026-09-16

The native facade now implements password and protected Ed25519 authentication,
explicit host-key inspection/pinning, and one independently pinned password
jump hop. Encrypted OpenSSH Ed25519 imports are parsed natively with a 64 KiB
input bound and stored under a non-synchronizing, passcode-required Keychain
access policy; JS receives only metadata and an opaque reference after import.

SFTP listing and 64 KiB streaming transfers are implemented with 256 MiB
per-transfer caps, progress events, task cancellation checks, temporary local
downloads, temporary remote uploads, explicit overwrite, rename on completion,
and best-effort cleanup on error. The iOS document picker supplies local file
authority. Remote forwarding binds the server side to loopback and has explicit
task ownership/cancellation. SOCKS is still reported as unavailable, and local
forwarding is not yet implemented.

Development builds `b8df3344-1302-4369-abf1-f9e230925e40` and
`3d7a156e-1952-4f5b-a894-b2b414a99d0c` finished. The combined SFTP/document
picker build is `e049db77-4e13-4767-849d-6e16f641024e`; device verification is
pending, so none of the new key/SFTP/forwarding capabilities are yet labeled
accepted.
