import Foundation
import XCTest
import Crypto
import Citadel
@testable import TermforgeSecurityCore

final class OpenSSHImportTests: XCTestCase {
  func testRealOpenSSHEnvelopesAndWrongPassphrase() throws {
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: false, attributes: [.posixPermissions: 0o700])
    defer { try? FileManager.default.removeItem(at: directory) }
    for encrypted in [false, true] {
      let path = directory.appendingPathComponent(encrypted ? "encrypted" : "plain")
      let passphrase = encrypted ? UUID().uuidString : ""
      let generator = Process()
      generator.executableURL = URL(fileURLWithPath: "/usr/bin/ssh-keygen")
      generator.arguments = ["-q", "-t", "ed25519", "-a", "16", "-N", passphrase, "-f", path.path]
      generator.standardOutput = FileHandle.nullDevice; generator.standardError = FileHandle.nullDevice
      try generator.run(); generator.waitUntilExit()
      XCTAssertEqual(generator.terminationStatus, 0)
      let envelope = try String(contentsOf: path, encoding: .utf8).trimmingCharacters(in: .whitespacesAndNewlines)
      XCTAssertEqual(try TermforgeKeyPreflight.encrypted(envelope), encrypted)
      let key = try Curve25519.Signing.PrivateKey(sshEd25519: envelope, decryptionKey: encrypted ? Data(passphrase.utf8) : nil)
      let message = Data("import-round-trip".utf8)
      XCTAssertTrue(key.publicKey.isValidSignature(try key.signature(for: message), for: message))
      if encrypted {
        XCTAssertThrowsError(try Curve25519.Signing.PrivateKey(sshEd25519: envelope, decryptionKey: Data("incorrect-fixture-passphrase".utf8)))
      }
    }
  }
}
