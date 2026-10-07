import Foundation
import Security
import LocalAuthentication
internal import ExpoModulesCore

/// An installation marker is app-private and excluded from backup. Keys from a
/// previous install remain in Keychain but require an explicit reassociation.
internal final class TermforgeCredentialInventory: @unchecked Sendable {
  static let shared = TermforgeCredentialInventory()
  private let lock = NSLock()
  private var cachedIdentity: Data?
  let service = "com.adrianglazer.termforge.keys"

  func identity() throws -> Data {
    lock.lock(); defer { lock.unlock() }
    if let cachedIdentity { return cachedIdentity }
    let manager = FileManager.default
    var directory = try manager.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true).appendingPathComponent("TermforgeIdentity", isDirectory: true)
    try manager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
    var values = URLResourceValues(); values.isExcludedFromBackup = true
    try directory.setResourceValues(values)
    var file = directory.appendingPathComponent("installation")
    let value: Data
    if manager.fileExists(atPath: file.path) {
      value = try Data(contentsOf: file)
      guard value.count == 36 else { throw Exception(name: "KEY_UNAVAILABLE", description: "Installation identity is invalid.") }
    } else {
      value = Data(UUID().uuidString.utf8)
      try value.write(to: file, options: [.atomic, .completeFileProtection])
    }
    try file.setResourceValues(values)
    cachedIdentity = value
    return value
  }

  func state(reference: String, context: LAContext? = nil) throws -> String {
    var result: CFTypeRef?
    var query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service, kSecAttrAccount as String: reference,
      kSecAttrSynchronizable as String: false, kSecReturnAttributes as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    if let context {
      query[kSecUseAuthenticationContext as String] = context
    } else {
      query[kSecUseAuthenticationUI as String] = kSecUseAuthenticationUIFail
    }
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecItemNotFound { return "missing" }
    // A non-interactive inventory cannot authorize use of a protected key.
    if status == errSecInteractionNotAllowed, context == nil { return "locked" }
    // Never interpret a locked device or an unexpected Keychain error as absence.
    guard status == errSecSuccess, let attributes = result as? [String: Any] else {
      let name = status == errSecUserCanceled || status == errSecAuthFailed ? "CANCELLED" : status == errSecInteractionNotAllowed ? "KEY_LOCKED" : "KEY_UNAVAILABLE"
      throw Exception(name: name, description: "The protected key metadata could not be opened.")
    }
    return (attributes[kSecAttrGeneric as String] as? Data) == (try identity()) ? "available" : "reassociate"
  }

  func orphanedReferences(known: Set<String>) throws -> [String] {
    var result: CFTypeRef?
    let status = SecItemCopyMatching([
      kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
      kSecAttrSynchronizable as String: false, kSecReturnAttributes as String: true,
      kSecMatchLimit as String: kSecMatchLimitAll,
      kSecUseAuthenticationUI as String: kSecUseAuthenticationUIFail,
    ] as CFDictionary, &result)
    if status == errSecItemNotFound { return [] }
    guard status == errSecSuccess, let items = result as? [[String: Any]] else {
      throw Exception(name: "KEY_LOCKED", description: "The protected key inventory is unavailable.")
    }
    return items.compactMap { $0[kSecAttrAccount as String] as? String }.filter { !known.contains($0) }.sorted()
  }

  func requireAssociated(reference: String, context: LAContext) throws {
    guard try state(reference: reference, context: context) == "available" else {
      throw Exception(name: "KEY_UNAVAILABLE", description: "Reassociate or re-import this key before use.")
    }
  }

  func associate(reference: String) throws {
    let status = SecItemUpdate([
      kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
      kSecAttrAccount as String: reference, kSecAttrSynchronizable as String: false,
    ] as CFDictionary, [kSecAttrGeneric as String: try identity()] as CFDictionary)
    guard status == errSecSuccess else { throw Exception(name: "KEY_UNAVAILABLE", description: "Key reassociation failed.") }
  }
}
