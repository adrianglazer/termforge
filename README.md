# Termforge

Termforge is a privacy-first terminal workstation for iPhone. Built with Expo, React Native, TypeScript, and custom iOS native modules, it is intended to provide real interactive SSH terminals, Terminator-style panes, persistent workspaces, secure SSH-key management, SFTP, port forwarding, snippets, and developer-oriented tools.

It is not a local Linux distribution or a simple SSH launcher: commands run on user-controlled remote hosts, while the app provides the terminal, connection, file-management, and security experience on iOS.

## Status

The project is in the planning/foundation stage. See [the implementation plan](docs/implementation-plan.md) and [the product requirements](instructions.md).

## Planned stack

- Expo development builds with React Native and strict TypeScript
- Swift-based Expo Modules for iOS-native terminal, SSH, SFTP, and secure-storage capabilities
- SQLite for non-secret local metadata and iOS Keychain for credentials and private keys
- EAS Build for all iOS compilation, internal development builds for native iteration, and EAS Submit/TestFlight for acceptance and release testing

Expo Go is not supported because Termforge requires custom native functionality.

## Intended development workflow

Once the foundation is in place:

```sh
npm install
npx expo start --dev-client
```

An EAS-built iOS development client will be required before running native terminal and SSH features. Local Xcode is not part of the required workflow. Apple Developer/App Store Connect access, registered test devices, and the final bundle identifier are deliberately not stored in this repository. Internal EAS builds are used for rapid native testing; signed store-distribution builds are tested through TestFlight.
