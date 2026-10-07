# How Termforge protects SSH keys

Termforge stores private SSH keys in Apple's native iOS Keychain with
device-bound protection and user authentication. These protections are enforced
by iOS. The public key and fingerprint shown in the app are the shareable part
of the key pair; copying them does not reveal the private key.

## Storage on your iPhone

Generated and imported Ed25519 private keys are stored in app-scoped Keychain
items. Saving a key requires a device passcode. Termforge uses
`kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` and disables Keychain
synchronization. These items do not sync through iCloud Keychain or migrate to
another device through a backup restore. Removing the device passcode makes
items stored with this protection unavailable. See Apple's
[device-only, passcode-required Keychain protection](https://developer.apple.com/documentation/security/ksecattraccessiblewhenpasscodesetthisdeviceonly).

The app's local database stores names, public keys, fingerprints and references
to Keychain items. Private-key bytes are handled by native code and are not
returned to the JavaScript interface. Termforge has no credential backend and
does not upload private keys to a Termforge service.

## Authentication when connecting

Keys generated or imported through the current interface use iOS `userPresence`
access control. iOS requires Face ID, Touch ID or the device passcode to authorize
protected access. Canceling or failing authentication prevents that key from
being used. An authentication context is scoped to the operation and invalidated
when it finishes; backgrounding also cancels tracked authentication contexts.
See Apple's [user-presence access control](https://developer.apple.com/documentation/security/secaccesscontrolcreateflags/userpresence).

The native layer also supports the stricter `biometryCurrentSet` policy for keys
already stored with that setting. It requires the enrolled biometrics, without
passcode fallback, and changes to biometric enrollment invalidate access. The
current creation/import interface uses the default user-presence policy.

Opening the app and viewing public-key metadata do not require reading private
key material. A locked key therefore does not need to block the entire app.
The installation-association check and private-key read still run in native code
when connecting, with an authentication context that permits the iOS prompt.
This is the distinction behind the protected-data startup fix.

## Sharing and recovery

“Copy public key” and “Export public key” share only the public key, which is the
part you install in a server's `authorized_keys`. Termforge does not provide
private-key export. SSH public-key authentication uses a signature; it does not
send the private key to the SSH server.

Supported encrypted OpenSSH imports retain their encrypted representation and
request their passphrase when used. Termforge does not remember that passphrase.
Generated keys use Keychain protection without a separate file passphrase.

Keep original imported keys and their passphrases securely for recovery.
Keychain entries can survive app removal, while local metadata may be deleted.
Termforge checks installation association before key use; leftovers from an
earlier installation require explicit reassociation or re-import.

## What these protections mean

These are concrete storage and authentication protections, not a guarantee that
every part of an app or device is immune to attack. Termforge's Ed25519 keys are
not Secure Enclave keys: native code needs private-key material in memory for
SSH authentication. Buffer cleanup cannot guarantee erasure of all Swift or
library copies. Verify your server's host fingerprint before trusting it, and
keep your iPhone passcode and iOS up to date.

This document describes the current implementation. The latest startup and
authentication corrections still require Apple compilation and iPhone testing
in the next authorized build. Local tests are not a security certification or
proof that the installed TestFlight version includes these corrections.

For implementation boundaries and validation requirements, see the
[security model](security.md).
