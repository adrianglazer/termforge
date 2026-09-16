# Development

## Prerequisites

Use Node 22.23.1 or newer and npm 10.9.8 or newer. iOS compilation uses EAS Build in the cloud; local Xcode and macOS are optional rather than project prerequisites. A physical-device development build requires an Apple Developer account, registered devices, and a replaceable bundle ID in `app.json` (`com.example.termforge`). Expo Go is unsupported.

## Linux workflow

Linux is the supported primary workstation. Run `npm install`, then `npm run lint`, `npm run typecheck`, `npm test`, and `npm run format`. EAS performs iOS compilation and signing remotely. After installing an EAS development build, start Metro with `npm start`; native Swift changes require a new EAS build.

For rapid device iteration, configure EAS ownership/signing, replace the bundle ID, register the test iPhone, and use `eas build --profile development --platform ios`. Install the resulting internal build from its EAS link or QR code and enable Developer Mode. Use a store-distribution EAS build plus `eas submit --platform ios` for TestFlight acceptance testing. Native modules are isolated under `modules/`; no real SSH or terminal behavior exists until task 03’s physical-iPhone proof.

See `docs/eas.md` for the canonical cloud-build, device-registration, and TestFlight workflow. Never mark a cloud build, installation, or device test as passed solely because an EAS job was queued.

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
