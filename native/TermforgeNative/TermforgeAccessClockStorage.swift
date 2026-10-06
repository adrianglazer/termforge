import Foundation
import Security

/// Clock state is not an entitlement. It cannot create paid or trial access.
internal enum TermforgeAccessClockStorage {
  private static let service = "com.adrianglazer.termforge.access-clock"
  private static var query: [String: Any] {
    [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
     kSecAttrAccount as String: "last-observed", kSecAttrSynchronizable as String: false]
  }
  static func read() throws -> TimeInterval {
    var request = query
    request[kSecReturnData as String] = true
    request[kSecMatchLimit as String] = kSecMatchLimitOne
    var value: CFTypeRef?
    let status = SecItemCopyMatching(request as CFDictionary, &value)
    if status == errSecItemNotFound { return 0 }
    guard status == errSecSuccess, let data = value as? Data,
          let text = String(data: data, encoding: .utf8), let time = Double(text),
          time.isFinite, time >= 0 else { throw ClockStorageError.unavailable }
    return time
  }
  static func write(_ time: TimeInterval) throws {
    let data = Data(String(time).utf8)
    let status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: data] as CFDictionary)
    if status == errSecItemNotFound {
      var item = query
      item[kSecValueData as String] = data
      item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
      guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw ClockStorageError.unavailable }
    } else if status != errSecSuccess { throw ClockStorageError.unavailable }
  }
  private enum ClockStorageError: Error { case unavailable }
}
