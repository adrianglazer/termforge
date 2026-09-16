internal import ExpoModulesCore
internal import Citadel
internal import NIO
internal import NIOSSH
internal import SwiftTerm
internal import Crypto
import CryptoKit
import Security
import UIKit

private struct HostInspectionRejected: Error {}

private final class CapturingHostKeyValidator: NIOSSHClientServerAuthenticationDelegate, @unchecked Sendable {
  private let lock = NSLock()
  private var capturedValue: String?

  var captured: String? {
    lock.lock()
    defer { lock.unlock() }
    return capturedValue
  }

  func validateHostKey(hostKey: NIOSSHPublicKey, validationCompletePromise: EventLoopPromise<Void>) {
    lock.lock()
    capturedValue = String(openSSHPublicKey: hostKey)
    lock.unlock()
    validationCompletePromise.fail(HostInspectionRejected())
  }
}

@MainActor
private final class NativeSession {
  let id: String
  var client: SSHClient?
  var writer: TTYStdinWriter?
  weak var view: TermforgeTerminalNativeView?
  var task: Task<Void, Never>?

  init(id: String) { self.id = id }
}

@MainActor
internal final class TermforgeSessionRegistry {
  static let shared = TermforgeSessionRegistry()
  private var sessions: [String: NativeSession] = [:]
  var event: ((String, [String: Any]) -> Void)?

  func create() -> String {
    let id = UUID().uuidString
    sessions[id] = NativeSession(id: id)
    emit(id, "created")
    return id
  }

  func attach(_ view: TermforgeTerminalNativeView, sessionId: String?) {
    guard let sessionId, let session = sessions[sessionId] else { return }
    session.view = view
    view.sessionId = sessionId
  }

  func connect(id: String, host: String, port: Int, username: String, password: String, hostKey: String, columns: Int, rows: Int) throws {
    try connect(id: id, host: host, port: port, hostKey: hostKey, columns: columns, rows: rows) {
      SSHAuthenticationMethod.passwordBased(username: username, password: password)
    }
  }

  func connectKey(id: String, host: String, port: Int, username: String, privateKey: Crypto.Curve25519.Signing.PrivateKey, hostKey: String, columns: Int, rows: Int) throws {
    try connect(id: id, host: host, port: port, hostKey: hostKey, columns: columns, rows: rows) {
      SSHAuthenticationMethod.ed25519(username: username, privateKey: privateKey)
    }
  }

  private func connect(id: String, host: String, port: Int, hostKey: String, columns: Int, rows: Int, authentication: @escaping @Sendable () -> SSHAuthenticationMethod) throws {
    guard let session = sessions[id], session.task == nil else { throw Exception(name: "INVALID_SESSION", description: "Session is missing or already connected.") }
    let trustedKey = try NIOSSHPublicKey(openSSHPublicKey: hostKey)
    emit(id, "connecting")
    session.task = Task<Void, Never> { @MainActor in
      do {
        let settings = SSHClientSettings(
          host: host,
          port: port,
          authenticationMethod: authentication,
          hostKeyValidator: .trustedKeys([trustedKey])
        )
        let client = try await SSHClient.connect(to: settings)
        session.client = client
        self.emit(id, "connected")
        let request = SSHChannelRequestEvent.PseudoTerminalRequest(
          wantReply: true,
          term: "xterm-256color",
          terminalCharacterWidth: columns,
          terminalRowHeight: rows,
          terminalPixelWidth: 0,
          terminalPixelHeight: 0,
          terminalModes: SSHTerminalModes([:])
        )
        try await client.withPTY(request) { inbound, outbound in
          await MainActor.run { session.writer = outbound; self.emit(id, "ready") }
          for try await output in inbound {
            let bytes: [UInt8]
            switch output {
            case .stdout(var buffer), .stderr(var buffer):
              bytes = buffer.readBytes(length: buffer.readableBytes) ?? []
            }
            if !bytes.isEmpty { await MainActor.run { session.view?.feed(bytes) } }
          }
        }
        await MainActor.run { self.emit(id, "closed") }
      } catch {
        await MainActor.run { self.emit(id, "failed", message: String(describing: error)) }
      }
      await MainActor.run { session.writer = nil; session.client = nil; session.task = nil }
    }
  }

  func write(id: String, bytes: [UInt8]) {
    guard let writer = sessions[id]?.writer else { return }
    Task<Void, Never> { try? await writer.write(ByteBuffer(bytes: bytes)) }
  }

  func resize(id: String, columns: Int, rows: Int, width: Int, height: Int) {
    guard let writer = sessions[id]?.writer else { return }
    Task<Void, Never> { try? await writer.changeSize(cols: columns, rows: rows, pixelWidth: width, pixelHeight: height) }
  }

  func close(id: String) {
    guard let session = sessions.removeValue(forKey: id) else { return }
    session.task?.cancel()
    if let client = session.client { Task<Void, Never> { try? await client.close() } }
    emit(id, "closed")
  }

  func client(id: String) throws -> SSHClient {
    guard let client = sessions[id]?.client else {
      throw Exception(name: "NOT_CONNECTED", description: "The SSH session is not connected.")
    }
    return client
  }

  func emit(_ id: String, _ state: String, message: String? = nil) {
    var body: [String: Any] = ["sessionId": id, "state": state]
    if let message { body["message"] = message }
    event?("onSessionState", body)
  }

  func title(id: String, value: String) {
    event?("onTerminalTitle", ["sessionId": id, "title": String(value.prefix(256))])
  }

  func bell(id: String) {
    event?("onTerminalBell", ["sessionId": id])
  }

  func progress(id: String, remotePath: String, bytes: UInt64, total: UInt64) {
    event?("onTransferProgress", ["sessionId": id, "remotePath": remotePath, "bytes": String(bytes), "total": String(total)])
  }
}

internal final class TermforgeNativeModule: Module {
  private let keyService = "com.adrianglazer.termforge.keys"

  func definition() -> ModuleDefinition {
    Name("TermforgeNative")
    Events("onSessionState", "onTerminalTitle", "onTerminalBell", "onTransferProgress")

    OnCreate {
      Task<Void, Never> { @MainActor in
        TermforgeSessionRegistry.shared.event = { [weak self] name, body in self?.sendEvent(name, body) }
      }
    }

    AsyncFunction("inspectHostKey") { (host: String, port: Int) async throws -> [String: String] in
      let validator = CapturingHostKeyValidator()
      var settings = SSHClientSettings(
        host: host,
        port: port,
        authenticationMethod: { SSHAuthenticationMethod.passwordBased(username: "host-key-inspection", password: "unused") },
        hostKeyValidator: .custom(validator)
      )
      settings.connectTimeout = .seconds(10)
      do { _ = try await SSHClient.connect(to: settings) } catch { }
      guard let key = validator.captured else { throw Exception(name: "HOST_KEY_UNAVAILABLE", description: "The server did not provide a host key.") }
      let parts = key.split(separator: " ", maxSplits: 1).map(String.init)
      guard parts.count == 2, let data = Data(base64Encoded: parts[1]) else { throw Exception(name: "INVALID_HOST_KEY", description: "The server returned an invalid host key.") }
      let digest = CryptoKit.SHA256.hash(data: data)
      return ["algorithm": parts[0], "key": key, "fingerprint": "SHA256:" + Data(digest).base64EncodedString().replacingOccurrences(of: "=", with: "")]
    }

    AsyncFunction("createSession") { () async -> String in await MainActor.run { TermforgeSessionRegistry.shared.create() } }
    AsyncFunction("connectPassword") { (id: String, host: String, port: Int, username: String, password: String, hostKey: String, columns: Int, rows: Int) async throws in
      try await MainActor.run { try TermforgeSessionRegistry.shared.connect(id: id, host: host, port: port, username: username, password: password, hostKey: hostKey, columns: columns, rows: rows) }
    }
    AsyncFunction("disconnect") { (id: String) async in await MainActor.run { TermforgeSessionRegistry.shared.close(id: id) } }

    AsyncFunction("importEd25519Key") { (openSSH: String, passphrase: String, protection: String) throws -> [String: String] in
      guard openSSH.utf8.count <= 64 * 1024 else { throw Exception(name: "KEY_TOO_LARGE", description: "Private key exceeds the 64 KiB import limit.") }
      let key: Crypto.Curve25519.Signing.PrivateKey
      do { key = try .init(sshEd25519: openSSH, decryptionKey: passphrase.isEmpty ? nil : Data(passphrase.utf8)) }
      catch { throw Exception(name: "INVALID_KEY_OR_PASSPHRASE", description: "The Ed25519 key or passphrase is invalid.") }
      let reference = UUID().uuidString.lowercased()
      try self.storePrivateKey(key.rawRepresentation, reference: reference, protection: protection)
      let publicKey = Self.openSSHPublicKey(key.publicKey.rawRepresentation)
      return ["reference": reference, "algorithm": "ed25519", "publicKey": publicKey, "fingerprint": Self.fingerprint(publicKey), "protection": protection]
    }

    AsyncFunction("connectKey") { (id: String, host: String, port: Int, username: String, reference: String, reason: String, hostKey: String, columns: Int, rows: Int) async throws in
      let raw = try self.loadPrivateKey(reference: reference, reason: reason)
      let key = try Crypto.Curve25519.Signing.PrivateKey(rawRepresentation: raw)
      try await MainActor.run { try TermforgeSessionRegistry.shared.connectKey(id: id, host: host, port: port, username: username, privateKey: key, hostKey: hostKey, columns: columns, rows: rows) }
    }

    AsyncFunction("listDirectory") { (id: String, path: String) async throws -> [[String: Any]] in
      try Self.validateRemotePath(path)
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      return try await client.withSFTP { sftp in
        let messages = try await sftp.listDirectory(atPath: path)
        return messages.flatMap(\.components).filter { $0.filename != "." && $0.filename != ".." }.map { item in
          ["name": item.filename, "longName": item.longname, "size": item.attributes.size.map { String($0) } ?? NSNull(), "permissions": item.attributes.permissions.map { String($0) } ?? NSNull()]
        }
      }
    }

    AsyncFunction("downloadFile") { (id: String, remotePath: String) async throws -> [String: String] in
      try Self.validateRemotePath(remotePath)
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      let destination = FileManager.default.temporaryDirectory.appendingPathComponent("termforge-\(UUID().uuidString).download")
      FileManager.default.createFile(atPath: destination.path, contents: nil)
      do {
        let result = try await client.withSFTP { sftp in
          try await sftp.withFile(filePath: remotePath, flags: .read) { file in
            let attributes = try await file.readAttributes()
            let total = attributes.size ?? 0
            guard total <= 256 * 1024 * 1024 else { throw Exception(name: "FILE_TOO_LARGE", description: "Downloads are limited to 256 MiB.") }
            let output = try FileHandle(forWritingTo: destination)
            defer { try? output.close() }
            var offset: UInt64 = 0
            while true {
              try _Concurrency.Task<Never, Never>.checkCancellation()
              var chunk = try await file.read(from: offset, length: 64 * 1024)
              guard chunk.readableBytes > 0 else { break }
              let data = Data(chunk.readableBytesView)
              try output.write(contentsOf: data)
              offset += UInt64(data.count)
              await MainActor.run { TermforgeSessionRegistry.shared.progress(id: id, remotePath: remotePath, bytes: offset, total: total) }
            }
            return ["url": destination.absoluteString, "bytes": String(offset)]
          }
        }
        return result
      } catch {
        try? FileManager.default.removeItem(at: destination)
        throw error
      }
    }

    AsyncFunction("uploadFile") { (id: String, localURL: URL, remotePath: String, overwrite: Bool) async throws -> [String: String] in
      try Self.validateRemotePath(remotePath)
      guard localURL.isFileURL else { throw Exception(name: "INVALID_LOCAL_URL", description: "Only an authorized local file URL may be uploaded.") }
      let scoped = localURL.startAccessingSecurityScopedResource()
      defer { if scoped { localURL.stopAccessingSecurityScopedResource() } }
      let values = try localURL.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
      guard values.isRegularFile == true else { throw Exception(name: "INVALID_LOCAL_FILE", description: "The selected URL is not a regular file.") }
      let total = UInt64(values.fileSize ?? 0)
      guard total <= 256 * 1024 * 1024 else { throw Exception(name: "FILE_TOO_LARGE", description: "Uploads are limited to 256 MiB.") }
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      let temporaryPath = remotePath + ".termforge-" + UUID().uuidString.lowercased()
      do {
        let uploaded = try await client.withSFTP { sftp in
          let input = try FileHandle(forReadingFrom: localURL)
          defer { try? input.close() }
          var offset: UInt64 = 0
          try await sftp.withFile(filePath: temporaryPath, flags: [.write, .create, .truncate]) { file in
            while true {
              try _Concurrency.Task<Never, Never>.checkCancellation()
              let data = try input.read(upToCount: 64 * 1024) ?? Data()
              guard !data.isEmpty else { break }
              try await file.write(ByteBuffer(data: data), at: offset)
              offset += UInt64(data.count)
              await MainActor.run { TermforgeSessionRegistry.shared.progress(id: id, remotePath: remotePath, bytes: offset, total: total) }
            }
          }
          if overwrite { try? await sftp.remove(at: remotePath) }
          try await sftp.rename(at: temporaryPath, to: remotePath)
          return offset
        }
        return ["bytes": String(uploaded)]
      } catch {
        try? await client.withSFTP { sftp in try? await sftp.remove(at: temporaryPath) }
        throw error
      }
    }

    View(TermforgeTerminalNativeView.self) {
      Prop("sessionId") { (view, id: String?) in TermforgeSessionRegistry.shared.attach(view, sessionId: id) }
    }
  }

  private func storePrivateKey(_ data: Data, reference: String, protection: String) throws {
    let flags: SecAccessControlCreateFlags
    switch protection {
    case "userPresence": flags = .userPresence
    case "biometryCurrentSet": flags = .biometryCurrentSet
    default: throw Exception(name: "INVALID_CONFIG", description: "Unsupported key protection policy.")
    }
    var accessError: Unmanaged<CFError>?
    guard let access = SecAccessControlCreateWithFlags(nil, kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly, flags, &accessError) else {
      throw accessError?.takeRetainedValue() ?? Exception(name: "KEY_UNAVAILABLE", description: "Could not create Keychain access control.")
    }
    let status = SecItemAdd([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: keyService, kSecAttrAccount as String: reference, kSecAttrAccessControl as String: access, kSecAttrSynchronizable as String: false, kSecValueData as String: data] as CFDictionary, nil)
    guard status == errSecSuccess else { throw Exception(name: "KEY_UNAVAILABLE", description: "Could not save the imported key.") }
  }

  private func loadPrivateKey(reference: String, reason: String) throws -> Data {
    let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: keyService, kSecAttrAccount as String: reference, kSecAttrSynchronizable as String: false, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne, kSecUseOperationPrompt as String: reason]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess, let data = result as? Data else {
      let name = status == errSecUserCanceled || status == errSecAuthFailed ? "CANCELLED" : status == errSecInteractionNotAllowed ? "KEY_LOCKED" : "KEY_UNAVAILABLE"
      throw Exception(name: name, description: "The protected key could not be opened.")
    }
    return data
  }

  private static func openSSHPublicKey(_ raw: Data) -> String {
    func length(_ count: Int) -> Data { var value = UInt32(count).bigEndian; return Data(bytes: &value, count: 4) }
    let algorithm = Data("ssh-ed25519".utf8)
    var blob = Data(); blob.append(length(algorithm.count)); blob.append(algorithm); blob.append(length(raw.count)); blob.append(raw)
    return "ssh-ed25519 \(blob.base64EncodedString())"
  }

  private static func fingerprint(_ openSSH: String) -> String {
    guard let encoded = openSSH.split(separator: " ").dropFirst().first, let blob = Data(base64Encoded: String(encoded)) else { return "" }
    return "SHA256:" + Data(CryptoKit.SHA256.hash(data: blob)).base64EncodedString().replacingOccurrences(of: "=", with: "")
  }

  private static func validateRemotePath(_ path: String) throws {
    guard !path.isEmpty, !path.contains("\0"), path.utf8.count <= 4096 else {
      throw Exception(name: "INVALID_PATH", description: "The remote path is invalid.")
    }
  }
}
