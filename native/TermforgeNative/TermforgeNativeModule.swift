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

private actor TransferCancellationRegistry {
  static let shared = TransferCancellationRegistry()
  private var cancelledSessions = Set<String>()
  func begin(_ id: String) { cancelledSessions.remove(id) }
  func cancel(_ id: String) { cancelledSessions.insert(id) }
  func check(_ id: String) throws {
    if cancelledSessions.contains(id) { throw CancellationError() }
  }
}

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
  var jumpClient: SSHClient?
  var writer: TTYStdinWriter?
  weak var view: TermforgeTerminalNativeView?
  var task: Task<Void, Never>?
  var forwards: [String: Task<Void, Never>] = [:]
  var localForwards: [String: Channel] = [:]

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

  func connectPasswordViaJump(id: String, host: String, port: Int, username: String, password: String, hostKey: String, jumpHost: String, jumpPort: Int, jumpUsername: String, jumpPassword: String, jumpHostKey: String, columns: Int, rows: Int) throws {
    let jump = JumpConnection(host: jumpHost, port: jumpPort, username: jumpUsername, password: jumpPassword, hostKey: jumpHostKey)
    try connect(id: id, host: host, port: port, hostKey: hostKey, columns: columns, rows: rows, jump: jump) {
      SSHAuthenticationMethod.passwordBased(username: username, password: password)
    }
  }

  private struct JumpConnection: Sendable {
    let host: String
    let port: Int
    let username: String
    let password: String
    let hostKey: String
  }

  private func connect(id: String, host: String, port: Int, hostKey: String, columns: Int, rows: Int, jump: JumpConnection? = nil, authentication: @escaping @Sendable () -> SSHAuthenticationMethod) throws {
    guard let session = sessions[id], session.task == nil else { throw Exception(name: "INVALID_SESSION", description: "Session is missing or already connected.") }
    let trustedKey = try NIOSSHPublicKey(openSSHPublicKey: hostKey)
    emit(id, "connecting")
    session.task = Task<Void, Never> { @MainActor in
      do {
        var settings = SSHClientSettings(
          host: host,
          port: port,
          authenticationMethod: authentication,
          hostKeyValidator: .trustedKeys([trustedKey])
        )
        settings.connectTimeout = .seconds(15)
        var retry = 0
        var connectedClient: SSHClient?
        while connectedClient == nil {
          do {
            if let jump {
              let jumpKey = try NIOSSHPublicKey(openSSHPublicKey: jump.hostKey)
              var jumpSettings = SSHClientSettings(host: jump.host, port: jump.port, authenticationMethod: { SSHAuthenticationMethod.passwordBased(username: jump.username, password: jump.password) }, hostKeyValidator: .trustedKeys([jumpKey]))
              jumpSettings.connectTimeout = .seconds(15)
              let jumpClient = try await SSHClient.connect(to: jumpSettings)
              session.jumpClient = jumpClient
              connectedClient = try await jumpClient.jump(to: settings)
            } else {
              connectedClient = try await SSHClient.connect(to: settings)
            }
          } catch {
            guard retry < 5, Self.isTransient(error) else { throw error }
            retry += 1
            self.event?("onSessionState", ["sessionId": id, "state": "reconnecting", "attempt": retry])
            let delay = min(30, 1 << (retry - 1))
            try await Task<Never, Never>.sleep(for: .seconds(delay))
          }
        }
        guard let client = connectedClient else { throw Exception(name: "CONNECTION_FAILED", description: "The SSH client could not be created.") }
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
        await MainActor.run { self.emitFailure(id, error: error) }
      }
      await MainActor.run { session.writer = nil; session.client = nil; session.jumpClient = nil; session.task = nil }
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

  func sendKey(id: String, key: String) throws {
    guard let view = sessions[id]?.view else { throw Exception(name: "TERMINAL_DETACHED", description: "The terminal view is not attached.") }
    try view.sendSemanticKey(key)
  }

  func sendText(id: String, text: String) throws {
    guard text.utf8.count <= 16 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Terminal text input is limited to 16 KiB.") }
    write(id: id, bytes: Array(text.utf8))
  }

  func pasteClipboard(id: String) throws {
    guard let text = UIPasteboard.general.string else { return }
    try sendText(id: id, text: text)
  }

  func search(id: String, term: String, direction: String, caseSensitive: Bool) throws -> [String: Int] {
    guard let view = sessions[id]?.view else { throw Exception(name: "TERMINAL_DETACHED", description: "The terminal view is not attached.") }
    return view.search(term: term, direction: direction, caseSensitive: caseSensitive)
  }

  func clearScrollback(id: String) throws {
    guard let view = sessions[id]?.view else { throw Exception(name: "TERMINAL_DETACHED", description: "The terminal view is not attached.") }
    view.clearScrollback()
  }

  func close(id: String) {
    guard let session = sessions.removeValue(forKey: id) else { return }
    session.task?.cancel()
    session.forwards.values.forEach { $0.cancel() }
    session.localForwards.values.forEach { $0.close(promise: nil) }
    if let client = session.client { Task<Void, Never> { try? await client.close() } }
    if let jumpClient = session.jumpClient { Task<Void, Never> { try? await jumpClient.close() } }
    emit(id, "closed")
  }

  func startRemoteForward(id: String, remotePort: Int, localHost: String, localPort: Int) throws -> String {
    guard (1...65535).contains(remotePort), (1...65535).contains(localPort), !localHost.isEmpty else {
      throw Exception(name: "INVALID_FORWARD", description: "Forward endpoints are invalid.")
    }
    guard let session = sessions[id], let client = session.client else {
      throw Exception(name: "NOT_CONNECTED", description: "The SSH session is not connected.")
    }
    let forwardId = UUID().uuidString.lowercased()
    session.forwards[forwardId] = Task<Void, Never> {
      do {
        try await client.runRemotePortForward(host: "127.0.0.1", port: remotePort, forwardingTo: localHost, port: localPort) { opened in
          await MainActor.run { self.event?("onForwardState", ["sessionId": id, "forwardId": forwardId, "state": "ready", "boundPort": opened.boundPort]) }
        }
      } catch is CancellationError {
      } catch {
        await MainActor.run { self.event?("onForwardState", ["sessionId": id, "forwardId": forwardId, "state": "failed", "message": String(describing: error)]) }
      }
      await MainActor.run { session.forwards.removeValue(forKey: forwardId) }
    }
    return forwardId
  }

  func stopForward(id: String, forwardId: String) {
    sessions[id]?.forwards.removeValue(forKey: forwardId)?.cancel()
    sessions[id]?.localForwards.removeValue(forKey: forwardId)?.close(promise: nil)
  }

  func registerLocalForward(id: String, forwardId: String, channel: Channel) {
    sessions[id]?.localForwards[forwardId] = channel
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

  func emitFailure(_ id: String, error: Error) {
    let detail = String(describing: error).lowercased()
    let code: String
    let message: String
    if error is InvalidHostKey || detail.contains("host key") {
      code = "HOST_KEY_CHANGED"; message = "The server identity does not match the approved host key."
    } else if detail.contains("auth") || detail.contains("password") {
      code = "AUTH_FAILED"; message = "The server rejected the selected credentials."
    } else if detail.contains("timed out") || detail.contains("timeout") {
      code = "TIMEOUT"; message = "The connection timed out."
    } else if detail.contains("refused") {
      code = "CONNECTION_REFUSED"; message = "The server refused the connection."
    } else if detail.contains("dns") || detail.contains("name or service") {
      code = "DNS_FAILED"; message = "The server name could not be resolved."
    } else if detail.contains("cancel") {
      code = "CANCELLED"; message = "The connection was cancelled."
    } else {
      code = "NETWORK_LOST"; message = "The SSH connection ended unexpectedly."
    }
    event?("onSessionState", ["sessionId": id, "state": "failed", "code": code, "message": message])
  }

  private static func isTransient(_ error: Error) -> Bool {
    if error is InvalidHostKey { return false }
    let detail = String(describing: error).lowercased()
    return !detail.contains("auth") && !detail.contains("password") && !detail.contains("host key") && !detail.contains("cancel")
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
    Events("onSessionState", "onTerminalTitle", "onTerminalBell", "onTransferProgress", "onForwardState")

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
    AsyncFunction("sendKey") { (id: String, key: String) async throws in try await MainActor.run { try TermforgeSessionRegistry.shared.sendKey(id: id, key: key) } }
    AsyncFunction("sendText") { (id: String, text: String) async throws in try await MainActor.run { try TermforgeSessionRegistry.shared.sendText(id: id, text: text) } }
    AsyncFunction("pasteClipboard") { (id: String) async throws in try await MainActor.run { try TermforgeSessionRegistry.shared.pasteClipboard(id: id) } }
    AsyncFunction("copyText") { (text: String) throws in
      guard text.utf8.count <= 64 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Clipboard text is too large.") }
      UIPasteboard.general.string = text
    }
    AsyncFunction("shareClipboard") { () throws in
      guard let text = UIPasteboard.general.string, !text.isEmpty else {
        throw Exception(name: "INVALID_CONFIG", description: "Copy terminal text before sharing it.")
      }
      guard text.utf8.count <= 64 * 1024 else {
        throw Exception(name: "RESOURCE_LIMIT", description: "Clipboard text is too large to share.")
      }
      guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
            let presenter = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
        throw Exception(name: "UNSUPPORTED", description: "The share sheet is unavailable right now.")
      }
      let controller = UIActivityViewController(activityItems: [text], applicationActivities: nil)
      presenter.present(controller, animated: true)
    }
    AsyncFunction("saveFileToFiles") { (url: URL) throws in
      guard url.isFileURL, FileManager.default.fileExists(atPath: url.path) else {
        throw Exception(name: "PATH_REJECTED", description: "The downloaded file is no longer available.")
      }
      guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
            let presenter = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
        throw Exception(name: "UNSUPPORTED", description: "Files export is unavailable right now.")
      }
      let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
      presenter.present(picker, animated: true)
    }
    AsyncFunction("searchTerminal") { (id: String, term: String, direction: String, caseSensitive: Bool) async throws -> [String: Int] in try await MainActor.run { try TermforgeSessionRegistry.shared.search(id: id, term: term, direction: direction, caseSensitive: caseSensitive) } }
    AsyncFunction("clearScrollback") { (id: String) async throws in try await MainActor.run { try TermforgeSessionRegistry.shared.clearScrollback(id: id) } }

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

    AsyncFunction("generateEd25519Key") { (protection: String) throws -> [String: String] in
      let key = Crypto.Curve25519.Signing.PrivateKey()
      let reference = UUID().uuidString.lowercased()
      try self.storePrivateKey(key.rawRepresentation, reference: reference, protection: protection)
      let publicKey = Self.openSSHPublicKey(key.publicKey.rawRepresentation)
      return ["reference": reference, "algorithm": "ed25519", "publicKey": publicKey, "fingerprint": Self.fingerprint(publicKey), "protection": protection]
    }

    AsyncFunction("deleteKey") { (reference: String) throws in
      let status = SecItemDelete([
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: self.keyService,
        kSecAttrAccount as String: reference,
        kSecAttrSynchronizable as String: false,
      ] as CFDictionary)
      guard status == errSecSuccess || status == errSecItemNotFound else {
        throw Exception(name: "KEY_UNAVAILABLE", description: "The protected key could not be deleted.")
      }
    }

    AsyncFunction("connectKey") { (id: String, host: String, port: Int, username: String, reference: String, reason: String, hostKey: String, columns: Int, rows: Int) async throws in
      let raw = try self.loadPrivateKey(reference: reference, reason: reason)
      let key = try Crypto.Curve25519.Signing.PrivateKey(rawRepresentation: raw)
      try await MainActor.run { try TermforgeSessionRegistry.shared.connectKey(id: id, host: host, port: port, username: username, privateKey: key, hostKey: hostKey, columns: columns, rows: rows) }
    }

    AsyncFunction("connectPasswordViaJump") { (id: String, host: String, port: Int, username: String, password: String, hostKey: String, jumpHost: String, jumpPort: Int, jumpUsername: String, jumpPassword: String, jumpHostKey: String, columns: Int, rows: Int) async throws in
      try await MainActor.run { try TermforgeSessionRegistry.shared.connectPasswordViaJump(id: id, host: host, port: port, username: username, password: password, hostKey: hostKey, jumpHost: jumpHost, jumpPort: jumpPort, jumpUsername: jumpUsername, jumpPassword: jumpPassword, jumpHostKey: jumpHostKey, columns: columns, rows: rows) }
    }

    AsyncFunction("listDirectory") { (id: String, path: String) async throws -> [[String: Any]] in
      try Self.validateRemotePath(path)
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      return try await client.withSFTP { sftp in
        let messages = try await sftp.listDirectory(atPath: path)
        return messages.flatMap(\.components).filter { $0.filename != "." && $0.filename != ".." }.map { item in
          ["name": item.filename, "longName": item.longname, "size": item.attributes.size.map { String($0) } ?? NSNull(), "permissions": item.attributes.permissions.map { String($0) } ?? NSNull(), "isDirectory": item.attributes.permissions.map { ($0 & 0o170000) == 0o040000 } ?? false]
        }
      }
    }

    AsyncFunction("renameRemote") { (id: String, sourcePath: String, destinationPath: String) async throws in
      try Self.validateRemotePath(sourcePath); try Self.validateRemotePath(destinationPath)
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      try await client.withSFTP { sftp in try await sftp.rename(at: sourcePath, to: destinationPath) }
    }

    AsyncFunction("removeRemote") { (id: String, path: String) async throws in
      try Self.validateRemotePath(path)
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      try await client.withSFTP { sftp in try await sftp.remove(at: path) }
    }

    AsyncFunction("createRemoteDirectory") { (id: String, path: String) async throws in
      try Self.validateRemotePath(path)
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      try await client.withSFTP { sftp in try await sftp.createDirectory(atPath: path) }
    }

    AsyncFunction("removeRemoteDirectory") { (id: String, path: String) async throws in
      try Self.validateRemotePath(path)
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      try await client.withSFTP { sftp in try await sftp.rmdir(at: path) }
    }

    AsyncFunction("downloadFile") { (id: String, remotePath: String) async throws -> [String: String] in
      try Self.validateRemotePath(remotePath)
      await TransferCancellationRegistry.shared.begin(id)
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
            var digest = CryptoKit.SHA256()
            while true {
              try _Concurrency.Task<Never, Never>.checkCancellation()
              try await TransferCancellationRegistry.shared.check(id)
              var chunk = try await file.read(from: offset, length: 64 * 1024)
              guard chunk.readableBytes > 0 else { break }
              let data = Data(chunk.readableBytesView)
              try output.write(contentsOf: data)
              digest.update(data: data)
              offset += UInt64(data.count)
              await MainActor.run { TermforgeSessionRegistry.shared.progress(id: id, remotePath: remotePath, bytes: offset, total: total) }
            }
            return ["url": destination.absoluteString, "bytes": String(offset), "sha256": digest.finalize().map { String(format: "%02x", $0) }.joined()]
          }
        }
        return result
      } catch {
        try? FileManager.default.removeItem(at: destination)
        throw error
      }
    }

    AsyncFunction("readText") { (id: String, remotePath: String) async throws -> [String: String] in
      try Self.validateRemotePath(remotePath)
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      return try await client.withSFTP { sftp in
        try await sftp.withFile(filePath: remotePath, flags: .read) { file in
          let size = try await file.readAttributes().size ?? 0
          guard size <= 2 * 1024 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Editor files are limited to 2 MiB.") }
          var bytes: [UInt8] = []; var offset: UInt64 = 0; var digest = CryptoKit.SHA256()
          while offset < size { var chunk = try await file.read(from: offset, length: min(64 * 1024, Int(size - offset))); let data = Data(chunk.readableBytesView); bytes.append(contentsOf: data); digest.update(data: data); offset += UInt64(chunk.readableBytes) }
          guard !bytes.contains(0), let text = String(bytes: bytes, encoding: .utf8) else { throw Exception(name: "INVALID_CONFIG", description: "The editor supports UTF-8 text files only.") }
          return ["text": text, "fingerprint": digest.finalize().map { String(format: "%02x", $0) }.joined()]
        }
      }
    }

    AsyncFunction("writeText") { (id: String, remotePath: String, text: String, expectedFingerprint: String) async throws in
      try Self.validateRemotePath(remotePath)
      let data = Data(text.utf8)
      guard data.count <= 2 * 1024 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Editor files are limited to 2 MiB.") }
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      let temporaryPath = remotePath + ".termforge-" + UUID().uuidString.lowercased()
      do {
        try await client.withSFTP { sftp in
          var actual = CryptoKit.SHA256()
          try await sftp.withFile(filePath: remotePath, flags: .read) { file in
            let size = try await file.readAttributes().size ?? 0; var offset: UInt64 = 0
            while offset < size { let chunk = try await file.read(from: offset, length: min(64 * 1024, Int(size - offset))); actual.update(data: Data(chunk.readableBytesView)); offset += UInt64(chunk.readableBytes) }
          }
          let actualFingerprint = actual.finalize().map { String(format: "%02x", $0) }.joined()
          guard actualFingerprint == expectedFingerprint else { throw Exception(name: "CONFLICT", description: "The remote file changed after it was opened. Reload it before saving.") }
          try await sftp.withFile(filePath: temporaryPath, flags: [.write, .create, .truncate]) { file in
            try await file.write(ByteBuffer(data: data), at: 0)
          }
          try? await sftp.remove(at: remotePath)
          try await sftp.rename(at: temporaryPath, to: remotePath)
        }
      } catch {
        try? await client.withSFTP { sftp in try? await sftp.remove(at: temporaryPath) }
        throw error
      }
    }

    AsyncFunction("uploadFile") { (id: String, localURL: URL, remotePath: String, overwrite: Bool) async throws -> [String: String] in
      try Self.validateRemotePath(remotePath)
      await TransferCancellationRegistry.shared.begin(id)
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
          var digest = CryptoKit.SHA256()
          try await sftp.withFile(filePath: temporaryPath, flags: [.write, .create, .truncate]) { file in
            while true {
              try _Concurrency.Task<Never, Never>.checkCancellation()
              try await TransferCancellationRegistry.shared.check(id)
              let data = try input.read(upToCount: 64 * 1024) ?? Data()
              guard !data.isEmpty else { break }
              digest.update(data: data)
              try await file.write(ByteBuffer(data: data), at: offset)
              offset += UInt64(data.count)
              await MainActor.run { TermforgeSessionRegistry.shared.progress(id: id, remotePath: remotePath, bytes: offset, total: total) }
            }
          }
          if overwrite { try? await sftp.remove(at: remotePath) }
          try await sftp.rename(at: temporaryPath, to: remotePath)
          return (offset, digest.finalize().map { String(format: "%02x", $0) }.joined())
        }
        return ["bytes": String(uploaded.0), "sha256": uploaded.1]
      } catch {
        try? await client.withSFTP { sftp in try? await sftp.remove(at: temporaryPath) }
        throw error
      }
    }

    AsyncFunction("cancelTransfers") { (id: String) async in
      await TransferCancellationRegistry.shared.cancel(id)
    }

    AsyncFunction("startRemoteForward") { (id: String, remotePort: Int, localHost: String, localPort: Int) async throws -> String in
      try await MainActor.run { try TermforgeSessionRegistry.shared.startRemoteForward(id: id, remotePort: remotePort, localHost: localHost, localPort: localPort) }
    }

    AsyncFunction("startLocalForward") { (id: String, localPort: Int, remoteHost: String, remotePort: Int) async throws -> String in
      guard (1...65535).contains(localPort), (1...65535).contains(remotePort), !remoteHost.isEmpty else { throw Exception(name: "INVALID_FORWARD", description: "Forward endpoints are invalid.") }
      let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      let bootstrap = ServerBootstrap(group: client.eventLoop)
        .serverChannelOption(ChannelOptions.backlog, value: 16)
        .childChannelInitializer { localChannel in
          localChannel.eventLoop.makeFutureWithTask {
            let origin = try localChannel.remoteAddress ?? SocketAddress(ipAddress: "127.0.0.1", port: 0)
            let sshChannel = try await client.createDirectTCPIPChannel(using: .init(targetHost: remoteHost, targetPort: remotePort, originatorAddress: origin)) { channel in
              channel.eventLoop.makeSucceededVoidFuture()
            }
            let (localGlue, sshGlue) = TermforgeGlueHandler.matchedPair()
            try await localChannel.pipeline.addHandler(localGlue).get()
            try await sshChannel.pipeline.addHandler(sshGlue).get()
          }
        }
      let listener = try await bootstrap.bind(host: "127.0.0.1", port: localPort).get()
      let forwardId = UUID().uuidString.lowercased()
      await MainActor.run { TermforgeSessionRegistry.shared.registerLocalForward(id: id, forwardId: forwardId, channel: listener) }
      return forwardId
    }

    AsyncFunction("stopForward") { (id: String, forwardId: String) async in
      await MainActor.run { TermforgeSessionRegistry.shared.stopForward(id: id, forwardId: forwardId) }
    }

    View(TermforgeTerminalNativeView.self) {
      Prop("sessionId") { (view, id: String?) in TermforgeSessionRegistry.shared.attach(view, sessionId: id) }
      Prop("fontSize") { (view, value: Double) in view.setFontSize(value) }
      Prop("scrollback") { (view, value: Int) in view.setScrollback(value) }
      Prop("foregroundColor") { (view, value: String) in view.setForegroundColor(value) }
      Prop("backgroundColor") { (view, value: String) in view.setBackgroundColor(value) }
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
