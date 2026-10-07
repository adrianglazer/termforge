internal import ExpoModulesCore
internal import Citadel
internal import Logging
internal import NIO
@preconcurrency internal import NIOSSH
internal import SwiftTerm
internal import Crypto
import CryptoKit
import Security
import LocalAuthentication
import UIKit

private struct HostInspectionRejected: Error {}

private struct PasswordConnectionOptions: Decodable, Sendable {
  let host: String
  let port: Int
  let username: String
  let challengeId: String
  let columns: Int
  let rows: Int
}

private struct KeyConnectionOptions: Decodable, Sendable {
  let host: String
  let port: Int
  let username: String
  let reference: String
  let reason: String
  let challengeId: String
  let columns: Int
  let rows: Int
}

private struct JumpPasswordConnectionOptions: Decodable, Sendable {
  let host: String
  let port: Int
  let username: String
  let challengeId: String
  let jumpHost: String
  let jumpPort: Int
  let jumpUsername: String
  let jumpChallengeId: String
  let columns: Int
  let rows: Int
}

private actor TransferCancellationRegistry {
  static let shared = TransferCancellationRegistry()
  private var operationsBySession: [String: Set<String>] = [:]
  private var cancelledOperations = Set<String>()

  private func key(sessionId: String, operationId: String) -> String { "\(sessionId):\(operationId)" }

  func begin(sessionId: String, operationId: String) throws {
    guard operationsBySession[sessionId]?.contains(operationId) != true,
          operationsBySession.values.reduce(0, { $0 + $1.count }) < 8 else {
      throw Exception(name: "RESOURCE_LIMIT", description: "Too many transfers or a duplicate operation ID.")
    }
    operationsBySession[sessionId, default: []].insert(operationId)
  }

  func finish(sessionId: String, operationId: String) {
    operationsBySession[sessionId]?.remove(operationId)
    if operationsBySession[sessionId]?.isEmpty == true { operationsBySession.removeValue(forKey: sessionId) }
    cancelledOperations.remove(key(sessionId: sessionId, operationId: operationId))
  }

  func cancel(sessionId: String, operationId: String) {
    guard operationsBySession[sessionId]?.contains(operationId) == true else { return }
    cancelledOperations.insert(key(sessionId: sessionId, operationId: operationId))
  }

  func cancelAll(sessionId: String) {
    for operationId in operationsBySession[sessionId] ?? [] {
      cancelledOperations.insert(key(sessionId: sessionId, operationId: operationId))
    }
  }

  func check(sessionId: String, operationId: String) throws {
    if cancelledOperations.contains(key(sessionId: sessionId, operationId: operationId)) { throw CancellationError() }
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
  var generation = 1
  var sequence = 0
  var client: SSHClient?
  var jumpClient: SSHClient?
  var writer: TTYStdinWriter?
  var view: TermforgeTerminalNativeView?
  var task: Task<Void, Never>?
  var writeTask: Task<Void, Never>?
  var writeSequence = 0
  var queuedInputBytes = 0
  var credentialReference: String?
  var resizeTask: Task<Void, Never>?
  var pendingResize: (columns: Int, rows: Int, width: Int, height: Int)?
  var forwards: [String: Task<Void, Never>] = [:]
  let transports = TermforgeForwardChannels()
  var localForwards: [String: TermforgeForwardChannels] = [:]

  init(id: String) { self.id = id }
}

@MainActor
internal final class TermforgeSessionRegistry {
  static let shared = TermforgeSessionRegistry()
  private var sessions: [String: NativeSession] = [:]
  var event: ((String, [String: Any]) -> Void)?

  func installLifecycleProtection() {
    TermforgeAppLock.shared.install { self.closeAll() }
    TermforgeAccessService.shared.teardown = { self.closeAll() }
    TermforgeAccessService.shared.install()
  }

  private func closeAll() {
    for id in Array(sessions.keys) { close(id: id) }
  }

  func create() throws -> String {
    try TermforgeAppLock.shared.requireUnlocked()
    try TermforgeAccessService.shared.requireRemoteAccess()
    guard sessions.count < 8, UIApplication.shared.applicationState == .active else {
      throw Exception(name: "RESOURCE_LIMIT", description: "Open at most eight foreground sessions.")
    }
    let id = UUID().uuidString
    let session = NativeSession(id: id)
    sessions[id] = session
    emit(session, "created")
    return id
  }

  func attach(_ view: TermforgeTerminalNativeView, sessionId: String?) {
    let previousId = view.sessionId
    view.sessionId = nil
    guard let sessionId else { return }
    if let previousId, previousId != sessionId,
       let previous = sessions[previousId], previous.view === view {
      previous.view = nil
    }
    guard let session = sessions[sessionId] else { return }
    if let previousView = session.view, previousView !== view {
      view.adoptTerminal(from: previousView)
      previousView.sessionId = nil
    } else if previousId != nil && previousId != sessionId {
      view.resetTerminal()
    }
    session.view = view
    view.sessionId = sessionId
  }

  func beginInspection() throws -> (String, TermforgeForwardChannels) {
    let id = try create()
    return (id, sessions[id]!.transports)
  }

  struct JumpConnection: Sendable {
    let host: String
    let port: Int
    let challengeId: String
    let authentication: @Sendable () async throws -> NIOSSHUserAuthenticationOffer
  }

  func beginJumpInspection(host: String, port: Int, challengeId: String) throws -> (String, TermforgeTrustLease, TermforgeForwardChannels) {
    let id = try create()
    do {
      let lease = try TermforgeHostTrust.shared.consume(challengeId, host: host, port: port, sessionId: id, generation: 1)
      return (id, lease, sessions[id]!.transports)
    } catch { close(id: id); throw error }
  }

  func contains(id: String) -> Bool { sessions[id] != nil }

  func isCurrent(id: String, generation: Int) -> Bool { sessions[id]?.generation == generation }

  func connect(id: String, host: String, port: Int, challengeId: String, columns: Int, rows: Int,
               credentialReference: String? = nil, jump: JumpConnection? = nil, isKey: Bool = false,
               authentication: @escaping @Sendable () async throws -> NIOSSHUserAuthenticationOffer) throws {
    try TermforgeAppLock.shared.requireUnlocked()
    try TermforgeAccessService.shared.requireRemoteAccess()
    guard UIApplication.shared.applicationState == .active, let session = sessions[id], session.task == nil else { throw Exception(name: "INVALID_CONFIG", description: "Session is missing or already connected.") }
    guard (1...65535).contains(port), !host.isEmpty, !host.contains("\0"),
          (1...1000).contains(columns), (1...1000).contains(rows) else {
      throw Exception(name: "INVALID_CONFIG", description: "Connection endpoints or terminal dimensions are invalid.")
    }
    session.credentialReference = credentialReference
    let targetApproval = try TermforgeHostTrust.shared.consume(challengeId, host: host, port: port, sessionId: id, generation: session.generation)
    let jumpApproval = try jump.map { try TermforgeHostTrust.shared.consume($0.challengeId, host: $0.host, port: $0.port, sessionId: id, generation: session.generation) }
    emit(session, "connecting")
    session.task = Task<Void, Never> { @MainActor in
      do {
        var retry = 0
        var connectedClient: SSHClient?
        while connectedClient == nil {
          try Task.checkCancellation()
          try TermforgeAccessService.shared.requireRemoteAccess()
          guard self.sessions[id] === session else { throw CancellationError() }
          let targetLease = targetApproval.forGeneration(session.generation)
          let jumpLease = jumpApproval?.forGeneration(session.generation)
          var settings = SSHClientSettings(host: host, port: port,
            authenticationMethod: { .custom(TermforgeDeferredAuthentication(lease: targetLease, isKey: isKey, provider: authentication)) },
            hostKeyValidator: .custom(targetLease))
          settings.connectTimeout = .seconds(15)
          settings.loginTimeout = .seconds(150)
          do {
            if let jump, let jumpLease {
              var jumpSettings = SSHClientSettings(host: jump.host, port: jump.port,
                authenticationMethod: { .custom(TermforgeDeferredAuthentication(lease: jumpLease, isKey: false, provider: jump.authentication)) },
                hostKeyValidator: .custom(jumpLease))
              jumpSettings.connectTimeout = .seconds(15)
              jumpSettings.loginTimeout = .seconds(150)
              let jumpClient = try await TermforgeSSHTransport.connect(settings: jumpSettings, owned: session.transports)
              guard !Task.isCancelled, self.sessions[id] === session else {
                try? await jumpClient.close()
                throw CancellationError()
              }
              session.jumpClient = jumpClient
              connectedClient = try await TermforgeSSHTransport.connect(settings: settings, owned: session.transports, jump: jumpClient)
            } else {
              connectedClient = try await TermforgeSSHTransport.connect(settings: settings, owned: session.transports)
            }
          } catch {
            guard retry < 5, !targetLease.authenticationRequested, jumpLease?.authenticationRequested != true, Self.isTransient(error) else { throw error }
            if let jumpClient = session.jumpClient { try? await jumpClient.close() }
            session.jumpClient = nil
            retry += 1
            session.generation += 1
            self.emit(session, "reconnecting", values: ["attempt": retry])
            let baseDelay = Double(min(30, 1 << (retry - 1)))
            let delay = baseDelay * Double.random(in: 0.8...1.2)
            try await Task<Never, Never>.sleep(for: .milliseconds(Int64(delay * 1_000)))
          }
        }
        guard let client = connectedClient else { throw Exception(name: "NETWORK_LOST", description: "The SSH client could not be created.") }
        guard !Task.isCancelled, self.sessions[id] === session else {
          try? await client.close()
          throw CancellationError()
        }
        try TermforgeAccessService.shared.requireRemoteAccess()
        session.client = client
        self.emit(session, "connected")
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
          try await MainActor.run {
            try TermforgeAccessService.shared.requireRemoteAccess()
            guard self.sessions[id] === session else { throw CancellationError() }
            session.writer = outbound; self.emit(session, "ready")
          }
          for try await output in inbound {
            let bytes: [UInt8]
            switch output {
            case .stdout(var buffer), .stderr(var buffer):
              bytes = buffer.readBytes(length: buffer.readableBytes) ?? []
            }
            try Task.checkCancellation()
            try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
            if !bytes.isEmpty { await MainActor.run {
              if (try? TermforgeAccessService.shared.requireRemoteAccess()) != nil, self.sessions[id] === session { session.view?.feed(bytes) }
            } }
          }
        }
        if let client = session.client { try? await client.close() }
        if let jumpClient = session.jumpClient { try? await jumpClient.close() }
        await MainActor.run {
          guard self.sessions[id] === session else { session.task = nil; return }
          self.emit(session, "closed")
          self.close(id: id, emitClosed: false)
          session.writer = nil
          session.client = nil
          session.jumpClient = nil
          session.task = nil
        }
      } catch {
        if let client = session.client { try? await client.close() }
        if let jumpClient = session.jumpClient { try? await jumpClient.close() }
        await MainActor.run {
          guard self.sessions[id] === session else { session.task = nil; return }
          self.emitFailure(session, error: error)
          self.close(id: id, emitClosed: false)
          session.writer = nil
          session.client = nil
          session.jumpClient = nil
          session.task = nil
        }
      }
    }
  }

  func write(id: String, bytes: [UInt8]) {
    guard (try? TermforgeAccessService.shared.requireRemoteAccess()) != nil else { return }
    guard let session = sessions[id], let writer = session.writer else { return }
    guard bytes.count <= 16 * 1024, session.queuedInputBytes + bytes.count <= 64 * 1024 else {
      emit(session, "failed", values: ["code": "RESOURCE_LIMIT", "message": "Terminal input exceeded the pending input limit."])
      close(id: id, emitClosed: false)
      return
    }
    session.queuedInputBytes += bytes.count
    let previous = session.writeTask
    session.writeSequence += 1
    let sequence = session.writeSequence
    session.writeTask = Task<Void, Never> { @MainActor in
      defer { session.queuedInputBytes -= bytes.count }
      if let previous { await previous.value }
      guard !Task.isCancelled, self.sessions[id] === session else { return }
      guard (try? TermforgeAccessService.shared.requireRemoteAccess()) != nil else { return }
      try? await writer.write(ByteBuffer(bytes: bytes))
      if session.writeSequence == sequence { session.writeTask = nil }
    }
  }

  func resize(id: String, columns: Int, rows: Int, width: Int, height: Int) {
    guard (try? TermforgeAccessService.shared.requireRemoteAccess()) != nil else { return }
    guard columns > 0, rows > 0, let session = sessions[id], session.writer != nil else { return }
    session.pendingResize = (columns, rows, width, height)
    guard session.resizeTask == nil else { return }
    session.resizeTask = Task<Void, Never> { @MainActor in
      try? await Task<Never, Never>.sleep(for: .milliseconds(50))
      guard !Task.isCancelled,
            self.sessions[id] === session,
            let size = session.pendingResize,
            let writer = session.writer else {
        session.resizeTask = nil
        return
      }
      session.pendingResize = nil
      guard (try? TermforgeAccessService.shared.requireRemoteAccess()) != nil else { return }
      try? await writer.changeSize(cols: size.columns, rows: size.rows, pixelWidth: size.width, pixelHeight: size.height)
      session.resizeTask = nil
    }
  }

  func setKeyboardVisible(id: String, visible: Bool) throws {
    guard let view = sessions[id]?.view else { throw Exception(name: "INVALID_CONFIG", description: "The terminal view is not attached.") }
    try view.setKeyboardVisible(visible)
  }

  func sendKey(id: String, key: String) throws {
    try TermforgeAppLock.shared.requireUnlocked()
    try TermforgeAccessService.shared.requireRemoteAccess()
    TermforgeAppLock.shared.recordActivity()
    guard let view = sessions[id]?.view else { throw Exception(name: "INVALID_CONFIG", description: "The terminal view is not attached.") }
    try view.sendSemanticKey(key)
  }

  func sendText(id: String, text: String) throws {
    try TermforgeAppLock.shared.requireUnlocked()
    try TermforgeAccessService.shared.requireRemoteAccess()
    TermforgeAppLock.shared.recordActivity()
    guard text.utf8.count <= 16 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Terminal text input is limited to 16 KiB.") }
    write(id: id, bytes: Array(text.utf8))
  }

  func pasteClipboard(id: String) throws {
    guard let text = UIPasteboard.general.string else { return }
    try sendText(id: id, text: text)
  }

  func search(id: String, term: String, direction: String, caseSensitive: Bool) throws -> [String: Int] {
    guard let view = sessions[id]?.view else { throw Exception(name: "INVALID_CONFIG", description: "The terminal view is not attached.") }
    return view.search(term: term, direction: direction, caseSensitive: caseSensitive)
  }

  func clearScrollback(id: String) throws {
    guard let view = sessions[id]?.view else { throw Exception(name: "INVALID_CONFIG", description: "The terminal view is not attached.") }
    view.clearScrollback()
  }

  func close(id: String, emitClosed: Bool = true) {
    guard let session = sessions[id] else { return }
    if emitClosed { emit(session, "closed") }
    sessions.removeValue(forKey: id)
    TermforgeCredentialPrompt.shared.cancel(sessionId: id)
    TermforgeKeyAccess.shared.cancel(sessionId: id)
    Task { await TransferCancellationRegistry.shared.cancelAll(sessionId: id) }
    session.writer = nil
    session.view?.sessionId = nil
    session.task?.cancel()
    session.transports.close()
    session.writeTask?.cancel()
    session.resizeTask?.cancel()
    session.forwards.values.forEach { $0.cancel() }
    session.localForwards.values.forEach { $0.close() }
    if let client = session.client { Task<Void, Never> { try? await client.close() } }
    if let jumpClient = session.jumpClient { Task<Void, Never> { try? await jumpClient.close() } }
  }

  func closeUsingKey(reference: String) {
    for id in sessions.values.filter({ $0.credentialReference == reference }).map(\.id) { close(id: id) }
  }

  func startRemoteForward(id: String, remotePort: Int, localHost: String, localPort: Int) throws -> String {
    guard (1...65535).contains(remotePort), (1...65535).contains(localPort), !localHost.isEmpty else {
      throw Exception(name: "INVALID_CONFIG", description: "Forward endpoints are invalid.")
    }
    guard let session = sessions[id], let client = session.client else {
      throw Exception(name: "INVALID_CONFIG", description: "The SSH session is not connected.")
    }
    let (forwardId, owned) = try reserveForward(id: id)
    session.forwards[forwardId] = Task<Void, Never> {
      do {
        try await owned.runRemote(client: client, remotePort: remotePort, localHost: localHost, localPort: localPort) { opened in
          try await MainActor.run {
            guard self.sessions[id] === session, session.localForwards[forwardId] === owned else { throw CancellationError() }
            self.send(session, eventName: "onForwardState", values: ["forwardId": forwardId, "state": "ready", "boundPort": opened.boundPort])
          }
        }
      } catch is CancellationError {
      } catch {
        await MainActor.run { self.send(session, eventName: "onForwardState", values: ["forwardId": forwardId, "state": "failed", "code": "NETWORK_LOST", "message": "The forward ended unexpectedly."]) }
      }
      owned.close()
      await MainActor.run {
        session.forwards.removeValue(forKey: forwardId)
        session.localForwards.removeValue(forKey: forwardId)
      }
    }
    return forwardId
  }

  func stopForward(id: String, forwardId: String) {
    guard let session = sessions[id], let owned = session.localForwards.removeValue(forKey: forwardId) else { return }
    owned.close()
    guard let task = session.forwards[forwardId] else { return }
    task.cancel()
    // A hostile peer may never acknowledge cancellation. Keep this slot reserved
    // and close the transport if the dependency's global-request future stalls.
    Task { @MainActor in
      try? await Task.sleep(for: .seconds(5))
      if self.sessions[id] === session, session.forwards[forwardId] != nil {
        self.emitFailure(session, error: Exception(name: "NETWORK_LOST", description: "The server did not acknowledge forward cancellation."))
        self.close(id: id, emitClosed: false)
      }
    }
  }

  func reserveForward(id: String) throws -> (String, TermforgeForwardChannels) {
    try TermforgeAppLock.shared.requireUnlocked()
    try TermforgeAccessService.shared.requireRemoteAccess()
    guard let session = sessions[id], session.client != nil, Set(session.localForwards.keys).union(session.forwards.keys).count < 4 else {
      throw Exception(name: "RESOURCE_LIMIT", description: "Connect first and use at most four forwards per session.")
    }
    let forwardId = UUID().uuidString.lowercased()
    let owned = TermforgeForwardChannels()
    session.localForwards[forwardId] = owned
    return (forwardId, owned)
  }

  func client(id: String) throws -> SSHClient {
    try TermforgeAppLock.shared.requireUnlocked()
    try TermforgeAccessService.shared.requireRemoteAccess()
    guard let client = sessions[id]?.client else {
      throw Exception(name: "INVALID_CONFIG", description: "The SSH session is not connected.")
    }
    return client
  }

  private func send(_ session: NativeSession, eventName: String, values: [String: Any]) {
    guard sessions[session.id] === session else { return }
    session.sequence += 1
    var body: [String: Any] = [
      "sessionId": session.id,
      "generation": session.generation,
      "sequence": session.sequence,
    ]
    values.forEach { body[$0.key] = $0.value }
    event?(eventName, body)
  }

  private func emit(_ session: NativeSession, _ state: String, values: [String: Any] = [:]) {
    var body = values
    body["state"] = state
    send(session, eventName: "onSessionState", values: body)
  }

  private func emitFailure(_ session: NativeSession, error: Error) {
    let detail = String(describing: error).lowercased()
    let code: String
    let message: String
    if let exception = error as? Exception,
       ["ACCESS_REQUIRED", "KEY_LOCKED", "KEY_UNAVAILABLE", "CANCELLED", "AUTH_FAILED"].contains(exception.name) {
      code = exception.name
      switch code {
      case "ACCESS_REQUIRED": message = "Open Access to restore a trial or lifetime purchase."
      case "KEY_LOCKED": message = "The protected SSH key is locked. Unlock the device and try again."
      case "KEY_UNAVAILABLE": message = "The protected SSH key is unavailable. Check or reassociate it in SSH Keys."
      case "CANCELLED": message = "Authentication was cancelled. The server was not connected."
      default: message = "The server rejected the selected credentials."
      }
    } else if error is InvalidHostKey || detail.contains("host key") {
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
    emit(session, "failed", values: ["code": code, "message": message])
  }

  private static func isTransient(_ error: Error) -> Bool {
    if error is InvalidHostKey { return false }
    let detail = String(describing: error).lowercased()
    return !detail.contains("auth") && !detail.contains("password") && !detail.contains("host key") && !detail.contains("cancel")
  }

  func title(id: String, value: String) {
    guard let session = sessions[id] else { return }
    send(session, eventName: "onTerminalTitle", values: ["title": String(value.prefix(256))])
  }

  func bell(id: String) {
    guard let session = sessions[id] else { return }
    send(session, eventName: "onTerminalBell", values: [:])
  }

  func progress(id: String, operationId: String, remotePath: String, bytes: UInt64, total: UInt64) {
    guard let session = sessions[id] else { return }
    send(session, eventName: "onTransferProgress", values: ["operationId": operationId, "remotePath": remotePath, "bytes": String(bytes), "total": String(total)])
  }
}

internal final class TermforgeNativeModule: Module, @unchecked Sendable {
  // SwiftLog is already a Citadel dependency. Discard its network/remote-error
  // diagnostics before constructing any SSH client; only allowlisted app events remain.
  private static let configureLogging: Void = { LoggingSystem.bootstrap { _ in SwiftLogNoOpLogHandler() } }()
  private let keyService = TermforgeCredentialInventory.shared.service

  func definition() -> ModuleDefinition {
    _ = Self.configureLogging
    let moduleName: any AnyDefinition = Name("TermforgeNative")
    let moduleEvents: any AnyDefinition = Events("onSessionState", "onTerminalTitle", "onTerminalBell", "onTransferProgress", "onForwardState", "onSecurityState", "onAccessState")

    let onCreate: any AnyDefinition = OnCreate {
      Task<Void, Never> { @MainActor in
        TermforgeAppLock.shared.changed = { [weak self] locked, revision in
          self?.sendEvent("onSecurityState", ["locked": locked, "revision": revision])
        }
        TermforgeAccessService.shared.changed = { [weak self] state in self?.sendEvent("onAccessState", state) }
        TermforgeSessionRegistry.shared.installLifecycleProtection()
        TermforgeSessionRegistry.shared.event = { [weak self] name, body in self?.sendEvent(name, body) }
      }
    }

    let inspectHostKeyDefinition: any AnyDefinition = AsyncFunction("inspectHostKey") { (host: String, port: Int) async throws -> [String: String] in
      try await Self.inspectHostKey(host: host, port: port)
    }

    let inspectThroughJumpDefinition: any AnyDefinition = AsyncFunction("inspectHostKeyThroughJump") { (host: String, port: Int, jumpHost: String, jumpPort: Int, username: String, challengeId: String) async throws -> [[String: String]] in
      try await Self.inspectHostKeyThroughJump(host: host, port: port, jumpHost: jumpHost, jumpPort: jumpPort, username: username, challengeId: challengeId)
    }

    let credentialStatesDefinition: any AnyDefinition = AsyncFunction("credentialStates") { (references: [String]) throws -> [String: String] in
      guard references.count <= 1000 else { throw Exception(name: "RESOURCE_LIMIT", description: "Too many key references.") }
      var states: [String: String] = [:]
      for reference in references { states[reference] = try TermforgeCredentialInventory.shared.state(reference: reference) }
      return states
    }
    let orphanedKeysDefinition: any AnyDefinition = AsyncFunction("orphanedKeys") { (references: [String]) async throws -> [String] in
      try await MainActor.run { try TermforgeAppLock.shared.requireUnlocked() }
      guard references.count <= 1000 else { throw Exception(name: "RESOURCE_LIMIT", description: "Too many key references.") }
      return try TermforgeCredentialInventory.shared.orphanedReferences(known: Set(references))
    }
    let reassociateKeyDefinition: any AnyDefinition = AsyncFunction("reassociateKey") { (reference: String) async throws -> Void in
      try await MainActor.run { try TermforgeAppLock.shared.requireUnlocked() }
      var raw = try self.loadPrivateKey(reference: reference, reason: "Authenticate to reassociate this SSH key.", requireAssociation: false)
      defer { raw.resetBytes(in: 0..<raw.count) }
      try await TermforgeAppLock.shared.waitUntilActive()
      try await MainActor.run { try TermforgeAppLock.shared.requireUnlocked() }
      try TermforgeCredentialInventory.shared.associate(reference: reference)
    }

    let accessStateDefinition: any AnyDefinition = AsyncFunction("accessState") { () async -> [String: Any] in
      await MainActor.run { TermforgeAccessService.shared.snapshot() }
    }
    let refreshAccessDefinition: any AnyDefinition = AsyncFunction("refreshAccess") { () async -> [String: Any] in
      await TermforgeAccessService.shared.reload()
      await TermforgeAccessService.shared.loadProducts()
      return await MainActor.run { TermforgeAccessService.shared.snapshot() }
    }
    let purchaseAccessDefinition: any AnyDefinition = AsyncFunction("purchaseAccess") { (kind: String) async -> [String: Any] in
      await TermforgeAccessService.shared.purchase(kind)
    }
    let restorePurchasesDefinition: any AnyDefinition = AsyncFunction("restorePurchases") { () async -> [String: Any] in
      await TermforgeAccessService.shared.restore()
    }

    let securityStateDefinition: any AnyDefinition = AsyncFunction("securityState") { () async -> [String: Any] in
      await MainActor.run { ["locked": TermforgeAppLock.shared.locked, "revision": TermforgeAppLock.shared.revision] }
    }
    let autoLockDefinition: any AnyDefinition = AsyncFunction("setAutoLockMinutes") { (minutes: Int) async throws -> Void in
      try await MainActor.run { try TermforgeAppLock.shared.setIdleMinutes(minutes) }
    }

    let pickLocalFileDefinition: any AnyDefinition = AsyncFunction("pickLocalFile") { (kind: String) async throws -> [String: String] in
      try await MainActor.run { try TermforgeAppLock.shared.requireUnlocked() }
      let epoch = TermforgeFileAccess.shared.currentEpoch()
      let selected = try await TermforgeFilePicker.shared.pick()
      return try await Task.detached {
        try TermforgeFileAccess.shared.stage(selected, kind: kind, epoch: epoch)
      }.value
    }
    let discardLocalFileDefinition: any AnyDefinition = AsyncFunction("discardLocalFile") { (handle: String) in
      TermforgeFileAccess.shared.discard(handle)
    }

    let prepareMetadataStorageDefinition: any AnyDefinition = AsyncFunction("prepareMetadataStorage") { () async throws -> String in
      try await MainActor.run { try TermforgeAppLock.shared.requireUnlocked() }
      try TermforgeFileAccess.shared.initialize()
      let manager = FileManager.default
      guard let documents = manager.urls(for: .documentDirectory, in: .userDomainMask).first else {
        throw Exception(name: "PATH_REJECTED", description: "Private storage is unavailable.")
      }
      var directory = documents.appendingPathComponent("SQLite", isDirectory: true)
      try manager.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
      try manager.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: directory.path)
      var values = URLResourceValues(); values.isExcludedFromBackup = true
      try directory.setResourceValues(values)
      for var file in try manager.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) {
        try manager.setAttributes([.protectionKey: FileProtectionType.complete], ofItemAtPath: file.path)
        try file.setResourceValues(values)
      }
      return directory.path
    }

    let createSessionDefinition: any AnyDefinition = AsyncFunction("createSession") { () async throws -> String in try await MainActor.run { try TermforgeSessionRegistry.shared.create() } }
    let connectPasswordDefinition: any AnyDefinition = AsyncFunction("connectPassword") { (id: String, encodedOptions: String) async throws -> Void in
      try await self.connectPassword(id: id, encodedOptions: encodedOptions)
    }
    let disconnectDefinition: any AnyDefinition = AsyncFunction("disconnect") { (id: String) async -> Void in
      await TransferCancellationRegistry.shared.cancelAll(sessionId: id)
      await MainActor.run { TermforgeSessionRegistry.shared.close(id: id) }
    }
    let keyboardDefinition: any AnyDefinition = AsyncFunction("setKeyboardVisible") { (id: String, visible: Bool) async throws -> Void in
      try await MainActor.run { try TermforgeSessionRegistry.shared.setKeyboardVisible(id: id, visible: visible) }
    }
    let sendKeyDefinition: any AnyDefinition = AsyncFunction("sendKey") { (id: String, key: String) async throws -> Void in try await MainActor.run { try TermforgeSessionRegistry.shared.sendKey(id: id, key: key) } }
    let sendTextDefinition: any AnyDefinition = AsyncFunction("sendText") { (id: String, text: String) async throws -> Void in try await MainActor.run { try TermforgeSessionRegistry.shared.sendText(id: id, text: text) } }
    let pasteClipboardDefinition: any AnyDefinition = AsyncFunction("pasteClipboard") { (id: String) async throws -> Void in try await MainActor.run { try TermforgeSessionRegistry.shared.pasteClipboard(id: id) } }
    let copyTextDefinition: any AnyDefinition = AsyncFunction("copyText") { (text: String) async throws -> Void in
      try await MainActor.run { try self.copyText(text: text) }
    }
    let shareClipboardDefinition: any AnyDefinition = AsyncFunction("shareClipboard") { () async throws -> Void in
      try await MainActor.run { try self.shareClipboard() }
    }
    let saveFileToFilesDefinition: any AnyDefinition = AsyncFunction("saveFileToFiles") { (handle: String) async throws -> Void in
      try await MainActor.run { try self.saveFileToFiles(handle: handle) }
    }
    let saveTextDraftToFilesDefinition: any AnyDefinition = AsyncFunction("saveTextDraftToFiles") { (text: String) async throws -> Void in
      try await MainActor.run { try self.saveTextDraftToFiles(text: text) }
    }
    let searchTerminalDefinition: any AnyDefinition = AsyncFunction("searchTerminal") { (id: String, term: String, direction: String, caseSensitive: Bool) async throws -> [String: Int] in try await MainActor.run { try TermforgeSessionRegistry.shared.search(id: id, term: term, direction: direction, caseSensitive: caseSensitive) } }
    let clearScrollbackDefinition: any AnyDefinition = AsyncFunction("clearScrollback") { (id: String) async throws -> Void in try await MainActor.run { try TermforgeSessionRegistry.shared.clearScrollback(id: id) } }

    let importEd25519KeyDefinition: any AnyDefinition = AsyncFunction("importEd25519Key") { (handle: String, protection: String) async throws -> [String: String] in
      try await self.importEd25519Key(handle: handle, protection: protection)
    }

    let generateEd25519KeyDefinition: any AnyDefinition = AsyncFunction("generateEd25519Key") { (protection: String) async throws -> [String: String] in
      try await MainActor.run { try TermforgeAppLock.shared.requireUnlocked() }
      return try self.generateEd25519Key(protection: protection)
    }

    let deleteKeyDefinition: any AnyDefinition = AsyncFunction("deleteKey") { (reference: String) async throws -> Void in
      await MainActor.run { TermforgeSessionRegistry.shared.closeUsingKey(reference: reference) }
      try self.deleteKey(reference: reference)
    }

    let connectKeyDefinition: any AnyDefinition = AsyncFunction("connectKey") { (id: String, encodedOptions: String) async throws -> Void in
      try await self.connectKey(id: id, encodedOptions: encodedOptions)
    }

    let connectPasswordViaJumpDefinition: any AnyDefinition = AsyncFunction("connectPasswordViaJump") { (id: String, encodedOptions: String) async throws -> Void in
      try await self.connectPasswordViaJump(id: id, encodedOptions: encodedOptions)
    }

    let listDirectoryDefinition: any AnyDefinition = AsyncFunction("listDirectory") { (id: String, path: String) async throws -> [[String: Any]] in
      try await self.listDirectory(id: id, path: path)
    }

    let renameRemoteDefinition: any AnyDefinition = AsyncFunction("renameRemote") { (id: String, sourcePath: String, destinationPath: String) async throws -> Void in
      try await self.renameRemote(id: id, sourcePath: sourcePath, destinationPath: destinationPath)
    }

    let removeRemoteDefinition: any AnyDefinition = AsyncFunction("removeRemote") { (id: String, path: String) async throws -> Void in
      try await self.removeRemote(id: id, path: path)
    }

    let createRemoteDirectoryDefinition: any AnyDefinition = AsyncFunction("createRemoteDirectory") { (id: String, path: String) async throws -> Void in
      try await self.createRemoteDirectory(id: id, path: path)
    }

    let removeRemoteDirectoryDefinition: any AnyDefinition = AsyncFunction("removeRemoteDirectory") { (id: String, path: String) async throws -> Void in
      try await self.removeRemoteDirectory(id: id, path: path)
    }

    let downloadFileDefinition: any AnyDefinition = AsyncFunction("downloadFile") { (id: String, operationId: String, remotePath: String) async throws -> [String: String] in
      try await self.downloadFile(id: id, operationId: operationId, remotePath: remotePath)
    }

    let readTextDefinition: any AnyDefinition = AsyncFunction("readText") { (id: String, remotePath: String) async throws -> [String: String] in
      try await self.readText(id: id, remotePath: remotePath)
    }

    let writeTextDefinition: any AnyDefinition = AsyncFunction("writeText") { (id: String, remotePath: String, text: String, expectedFingerprint: String) async throws -> [String: String] in
      try await self.writeText(id: id, remotePath: remotePath, text: text, expectedFingerprint: expectedFingerprint)
    }

    let uploadFileDefinition: any AnyDefinition = AsyncFunction("uploadFile") { (id: String, operationId: String, localHandle: String, remotePath: String, overwrite: Bool) async throws -> [String: String] in
      try await self.uploadFile(id: id, operationId: operationId, localHandle: localHandle, remotePath: remotePath, overwrite: overwrite)
    }

    let cancelTransferDefinition: any AnyDefinition = AsyncFunction("cancelTransfer") { (id: String, operationId: String) async -> Void in
      await TransferCancellationRegistry.shared.cancel(sessionId: id, operationId: operationId)
    }

    let startRemoteForwardDefinition: any AnyDefinition = AsyncFunction("startRemoteForward") { (id: String, remotePort: Int, localHost: String, localPort: Int) async throws -> String in
      try await MainActor.run { try TermforgeSessionRegistry.shared.startRemoteForward(id: id, remotePort: remotePort, localHost: localHost, localPort: localPort) }
    }

    let startLocalForwardDefinition: any AnyDefinition = AsyncFunction("startLocalForward") { (id: String, localPort: Int, remoteHost: String, remotePort: Int) async throws -> String in
      try await self.startLocalForward(id: id, localPort: localPort, remoteHost: remoteHost, remotePort: remotePort)
    }

    let stopForwardDefinition: any AnyDefinition = AsyncFunction("stopForward") { (id: String, forwardId: String) async -> Void in
      await MainActor.run { TermforgeSessionRegistry.shared.stopForward(id: id, forwardId: forwardId) }
    }

    let terminalView: any AnyDefinition = View(TermforgeTerminalNativeView.self) {
      Prop("sessionId") { (view: TermforgeTerminalNativeView, id: String?) -> Void in TermforgeSessionRegistry.shared.attach(view, sessionId: id) }
      Prop("fontSize") { (view: TermforgeTerminalNativeView, value: Double) -> Void in view.setFontSize(value) }
      Prop("scrollback") { (view: TermforgeTerminalNativeView, value: Int) -> Void in view.setScrollback(value) }
      Prop("foregroundColor") { (view: TermforgeTerminalNativeView, value: String) -> Void in view.setForegroundColor(value) }
      Prop("backgroundColor") { (view: TermforgeTerminalNativeView, value: String) -> Void in view.setBackgroundColor(value) }
    }

    // Explicit return bypasses the inferred result builder. The public builder
    // receives each actual definition; no arrays or nested modules are exported.
    return ModuleDefinitionBuilder.buildBlock(
      moduleName,
      moduleEvents,
      onCreate,
      inspectHostKeyDefinition,
      inspectThroughJumpDefinition,
      prepareMetadataStorageDefinition,
      credentialStatesDefinition,
      orphanedKeysDefinition,
      reassociateKeyDefinition,
      accessStateDefinition, refreshAccessDefinition, purchaseAccessDefinition, restorePurchasesDefinition,
      securityStateDefinition,
      autoLockDefinition,
      pickLocalFileDefinition,
      discardLocalFileDefinition,
      createSessionDefinition,
      connectPasswordDefinition,
      disconnectDefinition,
      keyboardDefinition,
      sendKeyDefinition,
      sendTextDefinition,
      pasteClipboardDefinition,
      copyTextDefinition,
      shareClipboardDefinition,
      saveFileToFilesDefinition,
      saveTextDraftToFilesDefinition,
      searchTerminalDefinition,
      clearScrollbackDefinition,
      importEd25519KeyDefinition,
      generateEd25519KeyDefinition,
      deleteKeyDefinition,
      connectKeyDefinition,
      connectPasswordViaJumpDefinition,
      listDirectoryDefinition,
      renameRemoteDefinition,
      removeRemoteDefinition,
      createRemoteDirectoryDefinition,
      removeRemoteDirectoryDefinition,
      downloadFileDefinition,
      readTextDefinition,
      writeTextDefinition,
      uploadFileDefinition,
      cancelTransferDefinition,
      startRemoteForwardDefinition,
      startLocalForwardDefinition,
      stopForwardDefinition,
      terminalView
    )
  }

  private func connectPassword(id: String, encodedOptions: String) async throws -> Void {
    let options: PasswordConnectionOptions = try Self.decodeConnectionOptions(encodedOptions)
    try await MainActor.run {
      try TermforgeSessionRegistry.shared.connect(id: id, host: options.host, port: options.port,
        challengeId: options.challengeId, columns: options.columns, rows: options.rows) {
        let password = try await TermforgeCredentialPrompt.shared.request(title: "SSH password", message: "Authenticate to \(options.host):\(options.port) as \(options.username).", sessionId: id)
        return NIOSSHUserAuthenticationOffer(username: options.username, serviceName: "", offer: .password(.init(password: password)))
      }
    }
  }

  private func connectPasswordViaJump(id: String, encodedOptions: String) async throws -> Void {
    let options: JumpPasswordConnectionOptions = try Self.decodeConnectionOptions(encodedOptions)
    try await MainActor.run {
      let jump = TermforgeSessionRegistry.JumpConnection(host: options.jumpHost, port: options.jumpPort,
        challengeId: options.jumpChallengeId) {
        let password = try await TermforgeCredentialPrompt.shared.request(title: "Jump host password", message: "Authenticate to \(options.jumpHost):\(options.jumpPort) as \(options.jumpUsername).", sessionId: id)
        return NIOSSHUserAuthenticationOffer(username: options.jumpUsername, serviceName: "", offer: .password(.init(password: password)))
      }
      try TermforgeSessionRegistry.shared.connect(id: id, host: options.host, port: options.port,
        challengeId: options.challengeId, columns: options.columns, rows: options.rows, jump: jump) {
        let password = try await TermforgeCredentialPrompt.shared.request(title: "SSH password", message: "Authenticate to \(options.host):\(options.port) as \(options.username).", sessionId: id)
        return NIOSSHUserAuthenticationOffer(username: options.username, serviceName: "", offer: .password(.init(password: password)))
      }
    }
  }

  @MainActor
  private func copyText(text: String) throws -> Void {
    try TermforgeAppLock.shared.requireUnlocked()
    guard text.utf8.count <= 64 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Clipboard text is too large.") }
    UIPasteboard.general.string = text
  }

  @MainActor
  private func shareClipboard() throws -> Void {
    try TermforgeAppLock.shared.requireUnlocked()
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

  @MainActor
  private func saveFileToFiles(handle: String) throws -> Void {
    try TermforgeAppLock.shared.requireUnlocked()
    let url = try TermforgeFileAccess.shared.resolve(handle, kind: "download", consume: false)
    guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
          let presenter = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
      throw Exception(name: "UNSUPPORTED", description: "Files export is unavailable right now.")
    }
    let picker = UIDocumentPickerViewController(forExporting: [url], asCopy: true)
    presenter.present(picker, animated: true)
  }

  @MainActor
  private func saveTextDraftToFiles(text: String) throws -> Void {
    try TermforgeAppLock.shared.requireUnlocked()
    guard text.utf8.count <= 2 * 1024 * 1024 else {
      throw Exception(name: "RESOURCE_LIMIT", description: "Draft export is limited to 2 MiB of UTF-8 text.")
    }
    let files = TermforgeFileAccess.shared
    let epoch = files.currentEpoch()
    var url = try files.temporaryFile()
    var handle: String?
    do {
      let namedURL = url.appendingPathExtension("txt")
      try FileManager.default.moveItem(at: url, to: namedURL)
      url = namedURL
      let output = try FileHandle(forWritingTo: url)
      defer { try? output.close() }
      try output.write(contentsOf: Data(text.utf8))
      try output.close()
      let published = try files.publish(url, kind: "download", epoch: epoch)
      handle = published
      try saveFileToFiles(handle: published)
    } catch {
      if let handle { files.discard(handle) }
      try? FileManager.default.removeItem(at: url)
      throw error
    }
  }

  private func importEd25519Key(handle: String, protection: String) async throws -> [String: String] {
    try await MainActor.run { try TermforgeAppLock.shared.requireUnlocked() }
    let url = try TermforgeFileAccess.shared.resolve(handle, kind: "key", consume: true)
    defer { try? FileManager.default.removeItem(at: url) }
    let file = try FileHandle(forReadingFrom: url)
    defer { try? file.close() }
    var data = try file.read(upToCount: 64 * 1024 + 1) ?? Data()
    defer { data.resetBytes(in: 0..<data.count) }
    guard data.count <= 64 * 1024, let original = String(data: data, encoding: .utf8) else {
      throw Exception(name: "RESOURCE_LIMIT", description: "Key files must be UTF-8 and at most 64 KiB.")
    }
    let openSSH = original.replacingOccurrences(of: "\r\n", with: "\n").trimmingCharacters(in: .whitespacesAndNewlines)
    let key = try await self.parseImportedKey(openSSH)
    try await MainActor.run { try TermforgeAppLock.shared.requireUnlocked() }
    let reference = UUID().uuidString.lowercased()
    // Preserve the original envelope, including its encryption. No passphrase is retained.
    try self.storePrivateKey(Data(openSSH.utf8), reference: reference, protection: protection)
    let publicKey = Self.openSSHPublicKey(key.publicKey.rawRepresentation)
    return ["reference": reference, "algorithm": "ed25519", "publicKey": publicKey, "fingerprint": Self.fingerprint(publicKey), "protection": protection]
  }

  private func parseImportedKey(_ openSSH: String, sessionId: String? = nil) async throws -> Crypto.Curve25519.Signing.PrivateKey {
    let encrypted: Bool
    do { encrypted = try TermforgeKeyPreflight.encrypted(openSSH) }
    catch { throw Exception(name: "UNSUPPORTED", description: "The key format or key derivation settings are unsupported.") }
    let passphrase: String
    if encrypted {
      passphrase = try await TermforgeCredentialPrompt.shared.request(title: "Key passphrase", message: "Unlock the selected encrypted Ed25519 key. The passphrase is not saved.", sessionId: sessionId)
    } else { passphrase = "" }
    guard !encrypted || !passphrase.isEmpty else { throw Exception(name: "AUTH_FAILED", description: "The key passphrase is required.") }
    do { return try .init(sshEd25519: openSSH, decryptionKey: encrypted ? Data(passphrase.utf8) : nil) }
    catch { throw Exception(name: "AUTH_FAILED", description: "The Ed25519 key or passphrase is invalid.") }
  }

  private func generateEd25519Key(protection: String) throws -> [String: String] {
    let key = Crypto.Curve25519.Signing.PrivateKey()
    let reference = UUID().uuidString.lowercased()
    try self.storePrivateKey(key.rawRepresentation, reference: reference, protection: protection)
    let publicKey = Self.openSSHPublicKey(key.publicKey.rawRepresentation)
    return ["reference": reference, "algorithm": "ed25519", "publicKey": publicKey, "fingerprint": Self.fingerprint(publicKey), "protection": protection]
  }

  private func deleteKey(reference: String) throws -> Void {
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

  private func connectKey(id: String, encodedOptions: String) async throws -> Void {
    let options: KeyConnectionOptions = try Self.decodeConnectionOptions(encodedOptions)
    try await MainActor.run {
      try TermforgeSessionRegistry.shared.connect(id: id, host: options.host, port: options.port,
        challengeId: options.challengeId, columns: options.columns, rows: options.rows,
        credentialReference: options.reference, isKey: true) {
        var raw = try await Task.detached {
          try self.loadPrivateKey(reference: options.reference, reason: "Authenticate to use this SSH key.", sessionId: id)
        }.value
        defer { raw.resetBytes(in: 0..<raw.count) }
        let key: Crypto.Curve25519.Signing.PrivateKey
        if raw.count == 32 { key = try Crypto.Curve25519.Signing.PrivateKey(rawRepresentation: raw) }
        else {
          guard let openSSH = String(data: raw, encoding: .utf8) else { throw Exception(name: "KEY_UNAVAILABLE", description: "The stored key is invalid.") }
          key = try await self.parseImportedKey(openSSH, sessionId: id)
        }
        return NIOSSHUserAuthenticationOffer(username: options.username, serviceName: "", offer: .privateKey(.init(privateKey: .init(ed25519Key: key))))
      }
    }
  }

  private func listDirectory(id: String, path: String) async throws -> [[String: Any]] {
    try Self.validateRemotePath(path)
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    return try await client.withSFTP { sftp in
      let messages = try await sftp.listDirectory(atPath: path)
      return messages.flatMap(\.components).filter { $0.filename != "." && $0.filename != ".." }.map { item in
        ["name": item.filename, "longName": item.longname, "size": item.attributes.size.map { String($0) } ?? NSNull(), "permissions": item.attributes.permissions.map { String($0) } ?? NSNull(), "isDirectory": item.attributes.permissions.map { ($0 & 0o170000) == 0o040000 } ?? false]
      }
    }
  }

  private func renameRemote(id: String, sourcePath: String, destinationPath: String) async throws -> Void {
    try Self.validateRemotePath(sourcePath); try Self.validateRemotePath(destinationPath)
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    try await client.withSFTP { sftp in try await sftp.rename(at: sourcePath, to: destinationPath) }
  }

  private func removeRemote(id: String, path: String) async throws -> Void {
    try Self.validateRemotePath(path)
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    try await client.withSFTP { sftp in try await sftp.remove(at: path) }
  }

  private func createRemoteDirectory(id: String, path: String) async throws -> Void {
    try Self.validateRemotePath(path)
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    try await client.withSFTP { sftp in try await sftp.createDirectory(atPath: path) }
  }

  private func removeRemoteDirectory(id: String, path: String) async throws -> Void {
    try Self.validateRemotePath(path)
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    try await client.withSFTP { sftp in try await sftp.rmdir(at: path) }
  }

  private func readText(id: String, remotePath: String) async throws -> [String: String] {
    try Self.validateRemotePath(remotePath)
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    return try await client.withSFTP { sftp in
      try await sftp.withFile(filePath: remotePath, flags: .read) { file in
        let size = try await file.readAttributes().size ?? 0
        guard size <= 2 * 1024 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Editor files are limited to 2 MiB.") }
        var bytes: [UInt8] = []; var offset: UInt64 = 0; var digest = CryptoKit.SHA256()
        while offset < size {
          try Task.checkCancellation()
          try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
          let length = UInt32(min(64 * 1024, size - offset))
          let chunk = try await file.read(from: offset, length: length)
          guard chunk.readableBytes > 0, chunk.readableBytes <= Int(length) else {
            throw Exception(name: "CONFLICT", description: "The remote file changed or returned invalid data.")
          }
          let data = Data(chunk.readableBytesView)
          bytes.append(contentsOf: data); digest.update(data: data); offset += UInt64(data.count)
        }
        guard !bytes.contains(0), let text = String(bytes: bytes, encoding: .utf8) else { throw Exception(name: "UNSUPPORTED", description: "The editor supports UTF-8 text files only.") }
        return ["text": text, "fingerprint": digest.finalize().map { String(format: "%02x", $0) }.joined()]
      }
    }
  }

  private func writeText(id: String, remotePath: String, text: String, expectedFingerprint: String) async throws -> [String: String] {
    try Self.validateRemotePath(remotePath)
    let data = Data(text.utf8)
    guard data.count <= 2 * 1024 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Editor files are limited to 2 MiB.") }
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    let temporaryPath = remotePath + ".termforge-" + UUID().uuidString.lowercased()
    let backupPath = remotePath + ".termforge-backup-" + UUID().uuidString.lowercased()
    do {
      try await client.withSFTP { sftp in
        var actual = CryptoKit.SHA256()
        try await sftp.withFile(filePath: remotePath, flags: .read) { file in
          let size = try await file.readAttributes().size ?? 0
          guard size <= 2 * 1024 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Editor files are limited to 2 MiB.") }
          var offset: UInt64 = 0
          while offset < size {
            try Task.checkCancellation()
            try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
            let length = UInt32(min(64 * 1024, size - offset))
            let chunk = try await file.read(from: offset, length: length)
            guard chunk.readableBytes > 0, chunk.readableBytes <= Int(length) else {
              throw Exception(name: "CONFLICT", description: "The remote file changed or returned invalid data.")
            }
            actual.update(data: Data(chunk.readableBytesView)); offset += UInt64(chunk.readableBytes)
          }
        }
        let actualFingerprint = actual.finalize().map { String(format: "%02x", $0) }.joined()
        guard actualFingerprint == expectedFingerprint else { throw Exception(name: "CONFLICT", description: "The remote file changed after it was opened. Reload it before saving.") }
        try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
        try await sftp.withFile(filePath: temporaryPath, flags: [.write, .create, .truncate]) { file in
          try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
          try await file.write(ByteBuffer(data: data), at: 0)
        }
        try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
        try await sftp.rename(at: remotePath, to: backupPath)
        do {
          try await sftp.rename(at: temporaryPath, to: remotePath)
          try? await sftp.remove(at: backupPath)
        } catch {
          try? await sftp.rename(at: backupPath, to: remotePath)
          throw error
        }
      }
      return ["fingerprint": Data(CryptoKit.SHA256.hash(data: data)).map { String(format: "%02x", $0) }.joined()]
    } catch {
      try? await client.withSFTP { sftp in
        try? await sftp.remove(at: temporaryPath)
        try? await sftp.rename(at: backupPath, to: remotePath)
      }
      throw error
    }
  }

  private static func captureHostKey(host: String, port: Int, owned: TermforgeForwardChannels, jump: SSHClient? = nil) async throws -> String {
    try await MainActor.run {
      try TermforgeAppLock.shared.requireUnlocked()
      try TermforgeAccessService.shared.requireRemoteAccess()
    }
    guard !host.isEmpty, !host.contains("\0"), host.utf8.count <= 253, (1...65535).contains(port) else {
      throw Exception(name: "INVALID_CONFIG", description: "The inspection endpoint is invalid.")
    }
    let validator = CapturingHostKeyValidator()
    var settings = SSHClientSettings(host: host, port: port,
      authenticationMethod: { SSHAuthenticationMethod.passwordBased(username: "host-key-inspection", password: "unused") },
      hostKeyValidator: .custom(validator))
    settings.connectTimeout = .seconds(10)
    do { _ = try await TermforgeSSHTransport.connect(settings: settings, owned: owned, jump: jump) } catch { }
    guard let key = validator.captured else { throw Exception(name: "HOST_KEY_UNKNOWN", description: "The server did not provide a host key.") }
    return key
  }

  private static func inspectedIdentity(host: String, port: Int, key: String) async throws -> [String: String] {
    let parts = key.split(separator: " ", maxSplits: 1).map(String.init)
    guard parts.count == 2, let data = Data(base64Encoded: parts[1]) else { throw Exception(name: "HOST_KEY_UNKNOWN", description: "The server returned an invalid host key.") }
    let challenge = try await MainActor.run { try TermforgeHostTrust.shared.record(host: host, port: port, key: key) }
    return ["challengeId": challenge, "algorithm": parts[0], "key": key, "fingerprint": "SHA256:" + Data(CryptoKit.SHA256.hash(data: data)).base64EncodedString().replacingOccurrences(of: "=", with: "")]
  }

  private static func inspectHostKey(host: String, port: Int) async throws -> [String: String] {
    let (id, owned) = try await MainActor.run { try TermforgeSessionRegistry.shared.beginInspection() }
    do {
      let key = try await captureHostKey(host: host, port: port, owned: owned)
      try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
      let identity = try await inspectedIdentity(host: host, port: port, key: key)
      await MainActor.run { TermforgeSessionRegistry.shared.close(id: id) }
      return identity
    } catch {
      await MainActor.run { TermforgeSessionRegistry.shared.close(id: id) }
      throw error
    }
  }

  private static func inspectHostKeyThroughJump(host: String, port: Int, jumpHost: String, jumpPort: Int, username: String, challengeId: String) async throws -> [[String: String]] {
    let (id, lease, owned) = try await MainActor.run { try TermforgeSessionRegistry.shared.beginJumpInspection(host: jumpHost, port: jumpPort, challengeId: challengeId) }
    do {
      var settings = SSHClientSettings(host: jumpHost, port: jumpPort, authenticationMethod: {
        .custom(TermforgeDeferredAuthentication(lease: lease, isKey: false) {
          let password = try await TermforgeCredentialPrompt.shared.request(title: "Jump host password", message: "Authenticate to \(jumpHost):\(jumpPort) as \(username) to inspect the destination.", sessionId: id)
          return NIOSSHUserAuthenticationOffer(username: username, serviceName: "", offer: .password(.init(password: password)))
        })
      }, hostKeyValidator: .custom(lease))
      settings.connectTimeout = .seconds(15); settings.loginTimeout = .seconds(150)
      let jump = try await TermforgeSSHTransport.connect(settings: settings, owned: owned)
      let targetKey = try await captureHostKey(host: host, port: port, owned: owned, jump: jump)
      try await lease.checkCurrent()
      let target = try await inspectedIdentity(host: host, port: port, key: targetKey)
      // Inspection consumed the first bastion challenge. Reissue the verified
      // identity for the separate connection attempt; no password is retained.
      let bastion = try await inspectedIdentity(host: jumpHost, port: jumpPort, key: lease.key)
      await MainActor.run { TermforgeSessionRegistry.shared.close(id: id) }
      return [target, bastion]
    } catch {
      await MainActor.run { TermforgeSessionRegistry.shared.close(id: id) }
      throw error
    }
  }

  private func startLocalForward(id: String, localPort: Int, remoteHost: String, remotePort: Int) async throws -> String {
    guard (1...65535).contains(localPort), (1...65535).contains(remotePort), !remoteHost.isEmpty else { throw Exception(name: "INVALID_CONFIG", description: "Forward endpoints are invalid.") }
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    let (forwardId, owned) = try await MainActor.run { try TermforgeSessionRegistry.shared.reserveForward(id: id) }
    do {
      try await owned.listenLocal(client: client, localPort: localPort, remoteHost: remoteHost, remotePort: remotePort)
    } catch {
      owned.close()
      await MainActor.run { TermforgeSessionRegistry.shared.stopForward(id: id, forwardId: forwardId) }
      throw error
    }
    return forwardId
  }

  private func downloadFile(id: String, operationId: String, remotePath: String) async throws -> [String: String] {
    try Self.validateRemotePath(remotePath)
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    let epoch = TermforgeFileAccess.shared.currentEpoch()
    let destination = try TermforgeFileAccess.shared.temporaryFile()
    do { try await TransferCancellationRegistry.shared.begin(sessionId: id, operationId: operationId) }
    catch { try? FileManager.default.removeItem(at: destination); throw error }
    do {
      _ = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      let result = try await client.withSFTP { sftp in
        try await sftp.withFile(filePath: remotePath, flags: .read) { file in
          let total = try await file.readAttributes().size ?? 0
          guard total <= 256 * 1024 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Downloads are limited to 256 MiB.") }
          let output = try FileHandle(forWritingTo: destination)
          defer { try? output.close() }
          var offset: UInt64 = 0
          var digest = CryptoKit.SHA256()
          while true {
            try Task.checkCancellation()
            try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
            try await TransferCancellationRegistry.shared.check(sessionId: id, operationId: operationId)
            let chunk = try await file.read(from: offset, length: 64 * 1024)
            guard chunk.readableBytes > 0 else { break }
            let data = Data(chunk.readableBytesView)
            guard data.count <= 64 * 1024, offset + UInt64(data.count) <= 256 * 1024 * 1024 else {
              throw Exception(name: "RESOURCE_LIMIT", description: "Download exceeded its streaming limit.")
            }
            try output.write(contentsOf: data)
            digest.update(data: data)
            offset += UInt64(data.count)
            await MainActor.run { TermforgeSessionRegistry.shared.progress(id: id, operationId: operationId, remotePath: remotePath, bytes: offset, total: total) }
          }
          let handle = try TermforgeFileAccess.shared.publish(destination, kind: "download", epoch: epoch)
          return ["url": handle, "bytes": String(offset), "sha256": digest.finalize().map { String(format: "%02x", $0) }.joined()]
        }
      }
      await TransferCancellationRegistry.shared.finish(sessionId: id, operationId: operationId)
      return result
    } catch {
      await TransferCancellationRegistry.shared.finish(sessionId: id, operationId: operationId)
      try? FileManager.default.removeItem(at: destination)
      throw error
    }
  }

  private func uploadFile(id: String, operationId: String, localHandle: String, remotePath: String, overwrite: Bool) async throws -> [String: String] {
    try Self.validateRemotePath(remotePath)
    let localURL = try TermforgeFileAccess.shared.resolve(localHandle, kind: "upload", consume: true)
    defer { try? FileManager.default.removeItem(at: localURL) }
    let values = try localURL.resourceValues(forKeys: [.isRegularFileKey, .fileSizeKey])
    guard values.isRegularFile == true else { throw Exception(name: "PATH_REJECTED", description: "The selected URL is not a regular file.") }
    let total = UInt64(values.fileSize ?? 0)
    guard total <= 256 * 1024 * 1024 else { throw Exception(name: "RESOURCE_LIMIT", description: "Uploads are limited to 256 MiB.") }
    let client = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
    let temporaryPath = remotePath + ".termforge-" + UUID().uuidString.lowercased()
    try await TransferCancellationRegistry.shared.begin(sessionId: id, operationId: operationId)
    do {
      _ = try await MainActor.run { try TermforgeSessionRegistry.shared.client(id: id) }
      let uploaded = try await client.withSFTP { sftp in
        let input = try FileHandle(forReadingFrom: localURL)
        defer { try? input.close() }
        var offset: UInt64 = 0
        var digest = CryptoKit.SHA256()
        try await sftp.withFile(filePath: temporaryPath, flags: [.write, .create, .truncate]) { file in
          while true {
            try Task.checkCancellation()
            try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
            try await TransferCancellationRegistry.shared.check(sessionId: id, operationId: operationId)
            let data = try input.read(upToCount: 64 * 1024) ?? Data()
            guard !data.isEmpty else { break }
            guard offset + UInt64(data.count) <= 256 * 1024 * 1024 else {
              throw Exception(name: "RESOURCE_LIMIT", description: "Upload exceeded its streaming limit.")
            }
            digest.update(data: data)
            try await file.write(ByteBuffer(data: data), at: offset)
            offset += UInt64(data.count)
            await MainActor.run { TermforgeSessionRegistry.shared.progress(id: id, operationId: operationId, remotePath: remotePath, bytes: offset, total: total) }
          }
        }
        try await TransferCancellationRegistry.shared.check(sessionId: id, operationId: operationId)
        try Task.checkCancellation()
        try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
        if overwrite {
          let backupPath = remotePath + ".termforge-backup-" + UUID().uuidString.lowercased()
          try await MainActor.run { try TermforgeAccessService.shared.requireRemoteAccess() }
          try await sftp.rename(at: remotePath, to: backupPath)
          do {
            try await sftp.rename(at: temporaryPath, to: remotePath)
            try? await sftp.remove(at: backupPath)
          } catch {
            try? await sftp.rename(at: backupPath, to: remotePath)
            throw error
          }
        } else {
          try await sftp.rename(at: temporaryPath, to: remotePath)
        }
        return (offset, digest.finalize().map { String(format: "%02x", $0) }.joined())
      }
      await TransferCancellationRegistry.shared.finish(sessionId: id, operationId: operationId)
      return ["bytes": String(uploaded.0), "sha256": uploaded.1]
    } catch {
      await TransferCancellationRegistry.shared.finish(sessionId: id, operationId: operationId)
      try? await client.withSFTP { sftp in try? await sftp.remove(at: temporaryPath) }
      throw error
    }
  }

  private static func decodeConnectionOptions<T: Decodable>(_ encodedOptions: String) throws -> T {
    guard encodedOptions.utf8.count <= 16 * 1024, let data = encodedOptions.data(using: .utf8) else {
      throw Exception(name: "INVALID_CONFIG", description: "Connection options are invalid.")
    }
    do {
      return try JSONDecoder().decode(T.self, from: data)
    } catch {
      throw Exception(name: "INVALID_CONFIG", description: "Connection options are invalid.")
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
      _ = accessError?.takeRetainedValue()
      throw Exception(name: "KEY_UNAVAILABLE", description: "Could not create Keychain access control.")
    }
    let status = SecItemAdd([kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: keyService, kSecAttrAccount as String: reference, kSecAttrAccessControl as String: access, kSecAttrSynchronizable as String: false, kSecValueData as String: data, kSecAttrGeneric as String: try TermforgeCredentialInventory.shared.identity()] as CFDictionary, nil)
    guard status == errSecSuccess else { throw Exception(name: "KEY_UNAVAILABLE", description: "Could not save the imported key.") }
  }

  private func loadPrivateKey(reference: String, reason: String, requireAssociation: Bool = true, sessionId: String? = nil) throws -> Data {
    let context = LAContext()
    context.localizedReason = reason
    TermforgeKeyAccess.shared.begin(context, sessionId: sessionId)
    defer { TermforgeKeyAccess.shared.finish(context) }
    if requireAssociation { try TermforgeCredentialInventory.shared.requireAssociated(reference: reference, context: context) }
    let query: [String: Any] = [kSecUseAuthenticationContext as String: context, kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: keyService, kSecAttrAccount as String: reference, kSecAttrSynchronizable as String: false, kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne, kSecUseOperationPrompt as String: reason]
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
      throw Exception(name: "PATH_REJECTED", description: "The remote path is invalid.")
    }
  }

}
