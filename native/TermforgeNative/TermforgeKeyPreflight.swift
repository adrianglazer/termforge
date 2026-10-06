import Foundation
internal enum TermforgeKeyEnvelopeError: Error { case unsupported, malformed }

/// Validate the OpenSSH envelope before Citadel's bcrypt/AES parser. Byte size
/// alone does not bound attacker-selected KDF work or protect empty buffers.
internal enum TermforgeKeyPreflight {
  static func encrypted(_ value: String) throws -> Bool {
    func rejected() -> TermforgeKeyEnvelopeError { .unsupported }
    let begin = "-----BEGIN OPENSSH PRIVATE KEY-----"
    let end = "-----END OPENSSH PRIVATE KEY-----"
    let compact = value.replacingOccurrences(of: "\n", with: "")
    guard value.utf8.count <= 64 * 1024, compact.hasPrefix(begin), compact.hasSuffix(end),
          let data = Data(base64Encoded: String(compact.dropFirst(begin.count).dropLast(end.count))) else { throw rejected() }
    var reader = Reader(bytes: Array(data))
    guard try reader.take(15) == Array("openssh-key-v1\0".utf8) else { throw rejected() }
    let cipher = try reader.string()
    let kdf = try reader.string()
    var options = Reader(bytes: try reader.blob())
    let encrypted: Bool
    if cipher == "none" {
      guard kdf == "none", options.remaining == 0 else { throw rejected() }
      encrypted = false
    } else {
      guard ["aes128-ctr", "aes256-ctr"].contains(cipher), kdf == "bcrypt" else { throw rejected() }
      let salt = try options.blob()
      let rounds = try options.integer()
      guard (16...64).contains(salt.count), (1...100).contains(rounds), options.remaining == 0 else { throw rejected() }
      encrypted = true
    }
    guard try reader.integer() == 1 else { throw rejected() }
    var publicKey = Reader(bytes: try reader.blob())
    guard try publicKey.string() == "ssh-ed25519", try publicKey.blob().count == 32, publicKey.remaining == 0 else { throw rejected() }
    let privateBlock = try reader.blob()
    guard !privateBlock.isEmpty, privateBlock.count % (encrypted ? 16 : 8) == 0, reader.remaining == 0 else { throw rejected() }
    return encrypted
  }

  private struct Reader {
    let bytes: [UInt8]
    var offset = 0
    var remaining: Int { bytes.count - offset }
    mutating func take(_ count: Int) throws -> [UInt8] {
      guard count >= 0, count <= remaining else {
        throw TermforgeKeyEnvelopeError.malformed
      }
      defer { offset += count }
      return Array(bytes[offset..<(offset + count)])
    }
    mutating func integer() throws -> UInt32 {
      try take(4).reduce(UInt32(0)) { ($0 << 8) | UInt32($1) }
    }
    mutating func blob() throws -> [UInt8] {
      let count = try integer()
      return try take(Int(count))
    }
    mutating func string() throws -> String {
      String(decoding: try blob(), as: UTF8.self)
    }
  }
}
