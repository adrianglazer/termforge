# Termforge

Termforge is a terminal workstation for iPhone, built with Expo, React Native,
TypeScript and custom Swift modules. Commands run on your remote SSH hosts.
The app has split-pane workspaces, SFTP and a small text editor, snippets,
local/remote TCP forwarding, password and Ed25519 authentication, and a
single password-authenticated bastion hop. Metadata stays in local SQLite;
credentials use iOS Keychain and native secure prompts. There is no app account,
backend, analytics or production mock connection path.

## Status

Tasks 05–07 local testing, hardening and security remediation are complete.
Task 08 release scripts, CI and documentation are implemented. Production
candidate 0.1.0/build 4 passed Apple compilation and signed archive inspection;
its TestFlight distribution status is recorded in task 08. Physical-iPhone
acceptance and final owner/store inputs remain pending. See [testing evidence](docs/testing.md),
[security boundaries](docs/security.md) and the [release checklist](docs/release-checklist.md).

RSA/ECDSA private keys, keyboard-interactive/MFA, SOCKS, multiple or key-authenticated
bastion hops, agent/X11 forwarding and private-key export are unavailable. Imported
encrypted Ed25519 keys prompt on use; generated keys are not passphrase-encrypted
or Secure Enclave keys. iPhone/iOS 17+ is the target; iPad is not advertised.

## Development

Use Node 22.23.1+ (validated with 24.4.1). pnpm is the repository preference;
this checkout has an npm lockfile and uses npm for reproducible CI/EAS installs.

```sh
npm ci
npm run release:check
npm start
```

`npm start` needs an installed compatible native development client. Expo Go
cannot load the Swift modules. Linux is the primary workstation; EAS performs
signed iOS builds in the cloud. Local Xcode is optional. Follow
[development](docs/development.md) and [EAS](docs/eas.md) before requesting a build.
The consolidated production candidate is build 4; use that same artifact for
TestFlight and the compact iPhone acceptance session. CI runs local checks only. Public App Store review is an explicit
owner action after acceptance and store materials are complete.

See [troubleshooting](docs/troubleshooting.md), [App Store material draft](docs/app-store.md),
[dependency advisories](docs/dependency-security-review.md) and
[product requirements](instructions.md). Remaining dependency advisories have
reachability assessments; the audit is not clean.
