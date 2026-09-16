# EAS and TestFlight workflow

EAS Build is the required iOS compiler for this project. Contributors may work
from Linux, macOS, or Windows; local Xcode is optional and is not an acceptance
prerequisite. Expo Go cannot load Termforge's custom Swift modules.

## Required owner inputs

- Expo project ownership and authenticated EAS CLI access
- final iOS bundle identifier
- paid Apple Developer team and signing authorization
- App Store Connect application and submission authorization for TestFlight
- registered physical iPhone, with Developer Mode enabled for internal
  development builds; iPad registration and testing are optional and non-blocking

Keep credentials, API keys, certificates, provisioning profiles, and device
identifiers out of the repository. Prefer EAS-managed credentials or protected
CI secrets.

## Native iteration

1. Run the JavaScript checks locally.
2. Build the custom development client with
   `eas build --platform ios --profile development`.
3. Install it on the registered test iPhone using the EAS installation link or
   QR code.
4. Start Metro with `npm start` for JavaScript-only iterations.
5. Submit another EAS development build whenever Swift, pods, native package
   pins, entitlements, plugins, or native configuration change.

Record the source revision, JavaScript lockfile, resolved native dependency
graph, EAS build URL/ID and image, build result, device model, OS version, and
observed result. A successful cloud compilation is not proof that installation,
launch, Keychain, SSH, terminal rendering, or lifecycle behavior works.

## TestFlight acceptance

Create a store-distribution build with the production/TestFlight EAS profile,
then upload it with `eas submit --platform ios` or the configured EAS workflow.
Use internal TestFlight testers for signed acceptance and release-candidate
validation. Record the App Store Connect build number and device/OS results.

TestFlight complements rather than replaces the development client: it is the
signed distribution and acceptance path, while internal development builds are
the faster native-debugging path. Public App Store review always remains an
explicit owner action.

Official references: [EAS development builds](https://docs.expo.dev/develop/development-builds/introduction/),
[iOS device cloud builds](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/),
[internal distribution](https://docs.expo.dev/build/internal-distribution/), and
[TestFlight submission](https://docs.expo.dev/submit/testflight/).
