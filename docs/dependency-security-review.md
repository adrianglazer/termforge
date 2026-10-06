# Dependency security review — 2026-10-06

This is a reachability review, not a clean-audit certificate. Repeat advisory
queries before releasing the shared task 08 candidate.

## JavaScript

`npm audit --omit=dev --json` completed after installing source-map-js 1.2.2:
**26 affected dependency-tree entries: 15 high, 11 moderate, zero critical**.
These entries expand four underlying advisories through their parent packages.
The extra source-map-js finding seen earlier today was fixed by the compatible
1.2.1 → 1.2.2 lockfile/install update. No broad Expo/React Native downgrade or
major-version override was used to force an artificially clean report.

| Advisory                                                                                      | Reviewed exposure and disposition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [braces GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)               | Installed 3.0.3, reached by Metro/micromatch build-time glob processing. No patched release was reported by the registry during review. The iOS terminal, SFTP, import and server data do not reach this Node build-tool path. Do not build untrusted repositories/configuration as a sandboxed data operation.                                                                                                                                                                                                            |
| [decode-uri-component GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | Installed 0.2.2 through Expo Router/query-string. Patched 0.5.0 is ESM and is incompatible with the current CommonJS caller without a coordinated router update. `+native-intent` now rejects links over 8192 characters, invalid UTF-8/percent encodings and encoded percent signs before router parsing. The native-link hook is used for both initial and warm links; executable tests cover malformed and nested escapes. No externally supplied links may bypass this gate. Runtime navigation uses app-owned routes. |
| [node-forge GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv)           | Installed 1.4.0 under Expo CLI/code-signing tooling; no patched release was reported during review. This RSA certificate-verification path is not used by Termforge's native SSH/Keychain implementation. Expo OTA update verification is not configured by this app. Re-review if introducing OTA signing or processing third-party certificates in build tooling.                                                                                                                                                        |
| [uuid GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq)                 | Installed 7.0.3 under xcode project generation. The affected caller-supplied-buffer v3/v5/v6 APIs are not used by that project-generation path, which uses v4. No untested major override was applied.                                                                                                                                                                                                                                                                                                                     |
| [source-map-js GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)        | Fixed at 1.2.2; local validation uses the updated installation and lockfile.                                                                                                                                                                                                                                                                                                                                                                                                                                               |

These mitigations and restricted paths are part of the reviewed configuration.
Changes to linking, router decoding, build input trust or update distribution
reopen this assessment. A package-version scanner will still report the first
four advisories.

## Native

OSV `querybatch` was called with the exact commits in `native/Package.resolved`
and Citadel's upstream baseline. Eleven remote packages and the local Citadel
baseline were checked. The only returned match was **CVE-2026-43823** for Swift
Crypto 3.15.1. Absence of an OSV match is not proof that a fork or package is safe.

The [upstream advisory GHSA-8q93-f6xh-4f6f](https://github.com/apple/swift-crypto/security/advisories/GHSA-8q93-f6xh-4f6f)
affects `_RSA` public-key DER/PEM parsing in `_CryptoExtras`. Upstream identifies
4.5.1 as patched; the OSV converted record includes an inconsistent last-affected
4.5.1 entry, so the upstream statement is authoritative. The NIOSSH fork requires
Swift Crypto `<4.0.0`; upgrading it independently would violate that constraint.

Citadel declared `_CryptoExtras` without importing it. The local manifest removes
that unused product. Neither app nor NIOSSH imports it, and the final native test
link file contains no `_CryptoExtras` objects. The Xcode app links `Crypto`, not
`_CryptoExtras`; verify the release archive agrees. Supported app key imports are
Ed25519, and RSA/SHA-1 SSH extensions remain unregistered. This removes the known
reachable product path without claiming the entire 3.15.1 source package is fixed.

Reviewed fork defaults: Curve25519/P256/P384/P521 ECDH, Ed25519/ECDSA host keys,
AES-128/256-GCM. Citadel's broader `SSHAlgorithms.all` is not enabled. Its key
parser has bounded native preflight before bcrypt/AES operations. SwiftTerm's
remote control-string inputs pass through the tested native admission gate.

Citadel's local patch also exposes the login deadline, fixes event-loop ownership
of pipeline setup, and resumes paused reads only after installing SSH handlers.
Real loopback SSH tests exercise deferred credentials, changed host rejection and
the bastion path. See [patch provenance](../native/Vendor/Citadel/README.termforge.md),
[package lock](../native/Package.resolved) and [native notices](native-dependency-notices.md).
The original licenses/copyright notices are retained. Candidate archive inclusion
of notices and the final resolved graph remains required; no EAS build was run.

## Task 08 Apple build continuation

Build 3 found that `_CryptoExtras` had incidentally exposed `CCryptoBoringSSL` to
Citadel on Apple. Reintroducing the vulnerable unused parser product is avoided:
the same Swift Crypto 3.15.1 upstream commit is locally vendored, with only one
manifest product added for its existing C target. Citadel now declares that product
explicitly. All upstream cryptographic implementation files match the original
reviewed checkout byte-for-byte. Ten remote pins plus Citadel/Swift Crypto local
baselines retain all reviewed versions and revisions. The CVE-2026-43823 disposition
and algorithm restrictions remain unchanged; no clean-audit claim is made.

Fourteen portable native tests pass with the corrected graph. `_CryptoExtras` has
no object in the native test link list. Production build 4 subsequently passes Apple compilation/archive inspection;
the full Xcode log contains no `_CryptoExtras` target/object mention and the IPA
includes the generated notice resource. See task 08 for the exact artifact.
Physical behavior and final owner distribution/notice review remain pending. Retained BoringSSL source copyright/license headers are included
in generated acknowledgements in addition to existing native/npm/CocoaPods notices.
