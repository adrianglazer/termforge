# Dependency license review

Review date: 2026-10-05. The package pins and resolved graph were not changed by
task 06.

## Runtime JavaScript graph

The exact JavaScript graph is recorded in `package-lock.json`. Direct runtime
packages (`expo` and the selected Expo modules, React/React Native,
`react-native-safe-area-context`, `react-native-screens`, and Zustand) report
MIT licenses in their installed package metadata and include license files in
their source distributions. TypeScript is Apache-2.0; the remaining direct
development dependencies report MIT licenses. Development-only tools are not
application runtime components, but their notices must remain in redistributed
tool/source bundles where applicable.

## Native graph

The native graph recorded by the accepted task 03 build is:

| Package               | Pin/resolution | License family |
| --------------------- | -------------- | -------------- |
| SwiftTerm             | 1.19.0         | MIT            |
| Citadel               | 0.12.1         | MIT            |
| Wellz26/swift-nio-ssh | 0.3.7          | Apache-2.0     |
| SwiftNIO              | 2.102.0        | Apache-2.0     |
| Swift Crypto          | 3.15.1         | Apache-2.0     |
| Swift ASN.1           | 1.7.2          | Apache-2.0     |
| Swift System          | 1.8.1          | Apache-2.0     |
| Swift Log             | 1.15.1         | Apache-2.0     |
| Swift Atomics         | 1.3.1          | Apache-2.0     |
| Swift Collections     | 1.6.0          | Apache-2.0     |
| BigInt                | 5.7.0          | MIT            |
| Swift Argument Parser | 1.8.2          | Apache-2.0     |

SwiftTerm and Citadel are exact pins in
`plugins/withTermforgeNativePackages.js`; the plugin also pins the directly
linked NIOSSH, NIO, and Crypto products to the task 03 resolved versions. The
Wellz26 NIOSSH package is a fork and must be attributed as such, not as Apple's
unmodified package.

All selected licenses are permissive and compatible with distribution of this
application. Copyright/license texts supplied by each dependency must be
included in the release acknowledgements/source distribution. Task 08 must
verify those acknowledgements are present in the archived candidate after SPM
resolution; a local JS export cannot prove archive contents.

## Task 07 continuation — 2026-10-06

The reviewed graph is now committed in `native/Package.resolved` and enforced by
the Xcode config plugin. Compared with the historical task 03 table, Swift ASN.1
is **1.7.3** and Swift Collections is **1.7.1**. Other remote versions are unchanged.
Citadel is a local, MIT-licensed **0.12.1 + Termforge patch** with exact provenance,
a reviewable patch and file hashes in `native/Vendor/Citadel`.

[Native notice texts](native-dependency-notices.md) were collected from these exact
checkouts. [Advisory triage](dependency-security-review.md) records remaining
scanner matches and reachability restrictions. source-map-js is patched to 1.2.2
(BSD-3-Clause); no new JavaScript dependency was introduced. The unused native
`_CryptoExtras` product is removed from Citadel's target. Final CocoaPods/archive
notices and their inclusion in distribution remain task 08 release checks.

## Task 08 package-wiring continuation

Swift Crypto remains 3.15.1 at revision `95ba0316a9b733e92bb6b071255ff46263bbe7dc`.
It is now a reviewed local snapshot with one manifest product exposing the existing
`CCryptoBoringSSL` C target directly; `_CryptoExtras` is not reinstated. Original
source/license/notice files are retained with hashes and a manifest-only patch.
Generated release acknowledgements include retained BoringSSL per-file license and
copyright comments, the Citadel C notices, the existing native texts and available
npm/CocoaPods notice texts. npm packages without supplied top-level notice texts
are explicitly inventoried for final distribution review; a bare SPDX identifier
is not presented as a complete copyright notice.
