# Development

## Prerequisites

Use Node 22.23.1+; local checks and CI use 24.4.1. The installed Linux runtime is
`/home/aglazer/.nvm/versions/node/v24.4.1/bin`; prepend it to `PATH` on this host.
pnpm is the repository preference, but it is unavailable on this workstation.
The checked-in `package-lock.json` drives `npm ci`, CI and EAS; do not create a
second lockfile without coordinating a package-manager migration.

Linux is the primary workstation. EAS cloud builds supply Apple tooling and
signing; local macOS/Xcode is optional. Expo Go is unsupported. The configured
identity is `@adrianglazer/termforge`, bundle ID `com.adrianglazer.termforge`,
EAS project `319c0c22-e047-4fdb-9d44-d841bb7d6a8a`. Preserve it unless the owner
intentionally changes the app identity. Signing and TestFlight access are separate
owner-managed prerequisites described in [EAS](eas.md).

## Local workflow

```sh
npm ci
npm run release:check
npm start
```

`release:check` runs tests, lint, TypeScript, formatting, source/dependency
verification, a bounded secret scan and diff whitespace checks. Individual
commands are in [testing](testing.md). `npm start` starts Metro for an installed
compatible development client. Production/TestFlight builds contain their JS
bundle and do not use Metro.

Swift modules live in `native/TermforgeNative` and `native/TermforgeNativeProbe`;
`plugins/withTermforgeNativePackages.js` wires pinned SPM products, the reviewed
local Citadel and manifest-only Swift Crypto patches, their resolved graph and
bundled acknowledgements into the
generated project. `ios/` is ignored and recreated by Expo prebuild. Do not hand-edit
it. Portable native tests and their compiler caches are outside the module scan.

JavaScript-only iteration can reuse a compatible development client. Swift,
pods, native pins, entitlements, plugins or native config changes require a new
binary, batched at the next milestone under [the build budget](../tasks/README.md).
The next planned build is **one production/TestFlight candidate after tasks 04–07**.
Do not create preview/development copies to repeat the same acceptance. An extra
internal build is allowed only for a documented native blocker that cannot be
diagnosed locally. `npm run build:development` and `npm run build:preview` exist for
explicitly planned future iterations, not as release prerequisites.

See [EAS](eas.md) for device registration and candidate/upload commands. A queued
job is not compilation or acceptance evidence. Existing task 03/04 acceptance
is historical evidence and does not validate the newer native security paths.

## Disposable SSH environment

Run `scripts/start-test-server.sh` to generate ignored Ed25519 credentials and
start separate target and bastion OpenSSH containers. The target is available
at `127.0.0.1:2222` and the bastion at `127.0.0.1:2223`. Both support password
and public-key authentication, PTYs, internal SFTP, and TCP forwarding. The
image includes the interactive programs required by `instructions.md` section
85, a Unicode file fixture, and a loopback HTTP target on port 8080 for tunnel
checks. See `tests/ssh-server/README.md` for commands and credential locations.

Run `scripts/stop-test-server.sh` to remove the containers and their host-key
volumes. A subsequent start deliberately changes host fingerprints, allowing a
known-host mismatch test. Generated client credentials remain ignored for
repeatable runs; remove `tests/ssh-server/generated/` to rotate them too.

On 2026-09-16 the environment was built with Docker on Linux and verified with
OpenSSH key authentication, a 100,000-line command, SFTP download plus byte
comparison, loopback local forwarding to the HTTP fixture, and an SSH target
reached through the bastion. These host-side checks validate the fixture only;
they are not native-app or physical-device acceptance results.
