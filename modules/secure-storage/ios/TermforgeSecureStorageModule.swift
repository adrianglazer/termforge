import CryptoKit
import ExpoModulesCore
import Security

public final class TermforgeSecureStorageModule: Module {
  private let service = "com.adrianglazer.termforge.keys"

  public func definition() -> ModuleDefinition {
    Name("TermforgeSecureStorage")

    AsyncFunction("generateEd25519Key") { (protection: String) throws -> [String: String] in
      let flags: SecAccessControlCreateFlags
      switch protection {
      case "userPresence": flags = .userPresence
      case "biometryCurrentSet": flags = .biometryCurrentSet
      default: throw SecureStorageError.invalidProtection
      }

      var accessError: Unmanaged<CFError>?
      guard let access = SecAccessControlCreateWithFlags(
        nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, flags, &accessError
      ) else {
        throw accessError?.takeRetainedValue() ?? SecureStorageError.keychainFailure(errSecParam)
      }

      let privateKey = Curve25519.Signing.PrivateKey()
      let reference = UUID().uuidString.lowercased()
      let status = SecItemAdd([
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: service,
        kSecAttrAccount as String: reference,
        kSecAttrAccessControl as String: access,
        kSecAttrSynchronizable as String: false,
        kSecValueData as String: privateKey.rawRepresentation
      ] as CFDictionary, nil)
      guard status == errSecSuccess else { throw SecureStorageError.keychainFailure(status) }

      let publicKey = privateKey.publicKey.rawRepresentation
      return [
        "reference": reference,
        "algorithm": "ed25519",
        "publicKey": Self.openSshPublicKey(publicKey),
        "fingerprint": Self.fingerprint(publicKey),
        "protection": protection
      ]
    }

    AsyncFunction("proveProtectedUse") { (reference: String, reason: String) throws -> Bool in
      let data = try self.loadPrivateKey(reference: reference, reason: reason)
      let key = try Curve25519.Signing.PrivateKey(rawRepresentation: data)
      _ = try key.signature(for: Data("termforge-key-proof-v1".utf8))
      return true
    }

    AsyncFunction("publicKey") { (reference: String, reason: String) throws -> [String: String] in
      let data = try self.loadPrivateKey(reference: reference, reason: reason)
      let key = try Curve25519.Signing.PrivateKey(rawRepresentation: data)
      let publicKey = key.publicKey.rawRepresentation
      return [
        "algorithm": "ed25519",
        "publicKey": Self.openSshPublicKey(publicKey),
        "fingerprint": Self.fingerprint(publicKey)
      ]
    }

    AsyncFunction("deleteKey") { (reference: String, reason: String) throws -> Void in
      _ = try self.loadPrivateKey(reference: reference, reason: reason)
      let status = SecItemDelete(self.baseQuery(reference: reference) as CFDictionary)
      guard status == errSecSuccess || status == errSecItemNotFound else {
        throw SecureStorageError.keychainFailure(status)
      }
    }
  }

  private func baseQuery(reference: String) -> [String: Any] {
    [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: reference,
      kSecAttrSynchronizable as String: false
    ]
  }

  private func loadPrivateKey(reference: String, reason: String) throws -> Data {
    var query = baseQuery(reference: reference)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne
    query[kSecUseOperationPrompt as String] = reason
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess, let data = result as? Data else {
      throw SecureStorageError.keychainFailure(status)
    }
    return data
  }

  private static func openSshPublicKey(_ rawKey: Data) -> String {
    let algorithm = Data("ssh-ed25519".utf8)
    var blob = Data()
    blob.append(lengthPrefix(algorithm.count))
    blob.append(algorithm)
    blob.append(lengthPrefix(rawKey.count))
    blob.append(rawKey)
    return "ssh-ed25519 \(blob.base64EncodedString())"
  }

  private static func fingerprint(_ rawKey: Data) -> String {
    let algorithm = Data("ssh-ed25519".utf8)
    var blob = Data()
    blob.append(lengthPrefix(algorithm.count))
    blob.append(algorithm)
    blob.append(lengthPrefix(rawKey.count))
    blob.append(rawKey)
    let digest = Data(SHA256.hash(data: blob)).base64EncodedString()
      .replacingOccurrences(of: "=", with: "")
    return "SHA256:\(digest)"
  }

  private static func lengthPrefix(_ value: Int) -> Data {
    var bigEndian = UInt32(value).bigEndian
    return Data(bytes: &bigEndian, count: MemoryLayout<UInt32>.size)
  }
}

private enum SecureStorageError: LocalizedError {
  case invalidProtection
  case keychainFailure(OSStatus)

  var errorDescription: String? {
    switch self {
    case .invalidProtection: return "INVALID_CONFIG"
    case .keychainFailure(let status):
      switch status {
      case errSecUserCanceled, errSecAuthFailed: return "CANCELLED"
      case errSecInteractionNotAllowed: return "KEY_LOCKED"
      case errSecItemNotFound: return "KEY_UNAVAILABLE"
      default: return "KEY_UNAVAILABLE"
      }
    }
  }
}
