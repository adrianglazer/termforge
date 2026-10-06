# Termforge Swift Crypto manifest patch

Upstream Swift Crypto **3.15.1**, commit
`95ba0316a9b733e92bb6b071255ff46263bbe7dc`.
All upstream source, license and notice files are retained byte-for-byte; only
`Package.swift` adds a library product for its existing `CCryptoBoringSSL` target.
`termforge.patch` records that diff and `source-manifest.json` hashes the snapshot.

Citadel directly imports that C module for OpenSSH AES-CTR envelope decryption,
bcrypt SHA-512 and its compiled (unregistered) legacy algorithm helpers. On Apple
platforms upstream `Crypto` forwards to CryptoKit and conditionally omits the C
target. `_CryptoExtras` previously brought it into the graph incidentally. The
build 3 compiler error exposed that hidden dependency after task 07 removed the
unused vulnerable RSA parser product. Citadel now explicitly depends on the C
product. `_CryptoExtras` is still absent from the application product graph.

This does not upgrade Swift Crypto, modify cryptographic implementations, register
legacy transport algorithms or change the advisory disposition. The original
`_CryptoExtras` source remains in the vendor snapshot for provenance but is not
linked. The pinned NIOSSH fork uses this same local package identity. Verify
sources, portable tests, actual Apple compilation and final archive/link evidence
before claiming acceptance. Do not alter this snapshot without updating provenance.
