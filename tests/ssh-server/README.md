# Disposable SSH environment

Run `scripts/start-test-server.sh` from the repository, then use the generated
credentials in `tests/ssh-server/generated/`. Nothing in that directory is
tracked. The target listens on `127.0.0.1:2222`; the bastion listens on
`127.0.0.1:2223`. Both provide PTY, SFTP, TCP forwarding, common interactive
tools, Unicode fixtures, and a loopback HTTP forwarding target on port 8080.

For physical-iPhone testing on the same trusted Wi-Fi, run
`scripts/start-test-server.sh --lan` and enter the computer's private LAN IP in
the app. LAN mode binds the disposable SSH ports to all host interfaces; keep
the host firewall enabled, never use it on an untrusted network, and stop the
fixture immediately after testing. The default remains loopback-only.

The encrypted Ed25519 fixture uses the test-only passphrase
`termforge-test-passphrase`. The generated `test.env` contains the disposable
password-authentication fixture. Its intentionally weak local-only test
password is `test`; never reuse it outside this disposable environment.

Useful host-side checks after startup:

```sh
ssh -p 2222 -i tests/ssh-server/generated/id_ed25519 termforge@127.0.0.1
ssh -J termforge@127.0.0.1:2223 -i tests/ssh-server/generated/id_ed25519 termforge@target
sftp -P 2222 -i tests/ssh-server/generated/id_ed25519 termforge@127.0.0.1
ssh -N -L 18080:127.0.0.1:8080 -p 2222 -i tests/ssh-server/generated/id_ed25519 termforge@127.0.0.1
```

The jump-host command relies on the container-network hostname `target`; the
client key may need an explicit `IdentityFile` for both hops in an SSH config.
Use the app's separate server records when exercising the native jump flow.

Run `scripts/stop-test-server.sh` to remove containers and host-key volumes.
Starting again then presents new server fingerprints, which supports the
known-host mismatch test. Delete the ignored `generated/` directory when you
also want to rotate client credentials.
