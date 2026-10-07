import Foundation
import SQLite3
internal import ExpoModulesCore
internal import NIO
@preconcurrency internal import NIOSSH

internal struct TermforgeTrustSnapshot: Equatable, Sendable {
  let identities: [String]
  let records: [[String]]

  static func read(host: String, port: Int) throws -> Self {
    let manager = FileManager.default
    guard let documents = manager.urls(for: .documentDirectory, in: .userDomainMask).first else { throw unavailable() }
    let path = documents.appendingPathComponent("SQLite/termforge-metadata.db").path
    var database: OpaquePointer?
    guard sqlite3_open_v2(path, &database, SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK else {
      if let database { sqlite3_close(database) }; throw unavailable()
    }
    defer { sqlite3_close(database) }
    sqlite3_busy_timeout(database, 500)
    var statement: OpaquePointer?
    guard sqlite3_prepare_v2(database, "SELECT algorithm, public_key, id, approved_at FROM known_hosts WHERE host = ? AND port = ? ORDER BY algorithm, public_key", -1, &statement, nil) == SQLITE_OK else { throw unavailable() }
    defer { sqlite3_finalize(statement) }
    sqlite3_bind_text(statement, 1, normalize(host), -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
    sqlite3_bind_int(statement, 2, Int32(port))
    var identities: [String] = []
    var records: [[String]] = []
    while true {
      let status = sqlite3_step(statement)
      if status == SQLITE_DONE { break }
      guard status == SQLITE_ROW, identities.count < 32,
            let algorithm = sqlite3_column_text(statement, 0), let key = sqlite3_column_text(statement, 1) else { throw unavailable() }
      identities.append(String(cString: algorithm) + " " + String(cString: key))
      guard let id = sqlite3_column_text(statement, 2), let approved = sqlite3_column_text(statement, 3) else { throw unavailable() }
      records.append([String(cString: id), String(cString: approved)])
    }
    return Self(identities: identities, records: records)
  }

  static func normalize(_ host: String) -> String {
    var value = host.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    if value.hasPrefix("["), value.hasSuffix("]") { value = String(value.dropFirst().dropLast()) }
    return value
  }
  private static func unavailable() -> Exception { Exception(name: "KEY_LOCKED", description: "Saved host trust is unavailable. Unlock and inspect again.") }
}

/// Challenges are native, bounded, short-lived and consumed exactly once.
@MainActor
internal final class TermforgeHostTrust {
  static let shared = TermforgeHostTrust()
  private struct Challenge {
    let host: String; let port: Int; let key: String; let snapshot: TermforgeTrustSnapshot
    let deadline: TimeInterval; let lockRevision: Int
  }
  private var challenges: [String: Challenge] = [:]

  func record(host: String, port: Int, key: String) throws -> String {
    try TermforgeAppLock.shared.requireUnlocked()
    let snapshot = try TermforgeTrustSnapshot.read(host: host, port: port)
    try Self.checkPinned(snapshot, key: key)
    challenges = challenges.filter { $0.value.deadline > ProcessInfo.processInfo.systemUptime }
    guard challenges.count < 64 else { throw Exception(name: "RESOURCE_LIMIT", description: "Too many pending identity reviews.") }
    let id = UUID().uuidString
    challenges[id] = Challenge(host: TermforgeTrustSnapshot.normalize(host), port: port, key: key, snapshot: snapshot, deadline: ProcessInfo.processInfo.systemUptime + 120, lockRevision: TermforgeAppLock.shared.revision)
    return id
  }

  func consume(_ id: String, host: String, port: Int, sessionId: String, generation: Int) throws -> TermforgeTrustLease {
    try TermforgeAppLock.shared.requireUnlocked()
    guard let challenge = challenges.removeValue(forKey: id),
          challenge.host == TermforgeTrustSnapshot.normalize(host), challenge.port == port,
          challenge.deadline > ProcessInfo.processInfo.systemUptime,
          challenge.lockRevision == TermforgeAppLock.shared.revision else {
      throw Exception(name: "HOST_KEY_UNKNOWN", description: "The identity review expired. Inspect the server again.")
    }
    let current = try TermforgeTrustSnapshot.read(host: host, port: port)
    try Self.checkPinned(current, key: challenge.key)
    // Trust-and-connect may have saved this exact initially unknown key. No
    // different identity or removal of previously trusted state is accepted.
    guard current == challenge.snapshot || (challenge.snapshot.identities.isEmpty && !current.identities.isEmpty) else {
      throw Exception(name: "HOST_KEY_CHANGED", description: "Saved trust changed after inspection.")
    }
    return TermforgeTrustLease(host: challenge.host, port: port, key: challenge.key, snapshot: current,
      sessionId: sessionId, generation: generation, lockRevision: challenge.lockRevision)
  }

  static func checkPinned(_ snapshot: TermforgeTrustSnapshot, key: String) throws {
    let algorithm = key.split(separator: " ").first.map(String.init) ?? ""
    guard snapshot.identities.isEmpty || snapshot.identities.allSatisfy({ $0 == algorithm + " " + key }) else {
      throw Exception(name: "HOST_KEY_CHANGED", description: "The host key differs from saved trust.")
    }
  }
}

internal final class TermforgeTrustLease: NIOSSHClientServerAuthenticationDelegate, @unchecked Sendable {
  let host: String; let port: Int; let key: String
  private let snapshot: TermforgeTrustSnapshot
  let sessionId: String; let generation: Int; let lockRevision: Int
  private let lock = NSLock()
  private var validated = false
  private var requested = false
  var authenticationRequested: Bool { lock.lock(); defer { lock.unlock() }; return requested }

  init(host: String, port: Int, key: String, snapshot: TermforgeTrustSnapshot, sessionId: String, generation: Int, lockRevision: Int) {
    self.host = host; self.port = port; self.key = key; self.snapshot = snapshot
    self.sessionId = sessionId; self.generation = generation; self.lockRevision = lockRevision
  }

  func forGeneration(_ generation: Int) -> TermforgeTrustLease {
    TermforgeTrustLease(host: host, port: port, key: key, snapshot: snapshot,
      sessionId: sessionId, generation: generation, lockRevision: lockRevision)
  }

  func checkCurrent() async throws {
    try await TermforgeAppLock.shared.waitUntilActive()
    try await MainActor.run {
      try TermforgeAppLock.shared.requireUnlocked()
      try TermforgeAccessService.shared.requireRemoteAccess()
      guard TermforgeAppLock.shared.revision == self.lockRevision,
            TermforgeSessionRegistry.shared.isCurrent(id: self.sessionId, generation: self.generation) else { throw CancellationError() }
    }
    guard try TermforgeTrustSnapshot.read(host: host, port: port) == snapshot else {
      throw Exception(name: "HOST_KEY_CHANGED", description: "Saved trust changed during authentication.")
    }
  }

  func validateHostKey(hostKey: NIOSSHPublicKey, validationCompletePromise: EventLoopPromise<Void>) {
    guard String(openSSHPublicKey: hostKey) == key else { validationCompletePromise.fail(Exception(name: "HOST_KEY_CHANGED", description: "The host key changed.")); return }
    Task {
      do {
        try await checkCurrent()
        markValidated()
        validationCompletePromise.succeed(())
      } catch { validationCompletePromise.fail(error) }
    }
  }
  private func markValidated() { lock.lock(); defer { lock.unlock() }; validated = true }
  func beginAuthentication() throws {
    lock.lock(); defer { lock.unlock() }
    guard validated, !requested else { throw Exception(name: "AUTH_FAILED", description: "Authentication was rejected or repeated.") }
    requested = true
  }
}

/// Resolve secrets only after successful host validation; retain the provider,
/// not the resulting password/private-key offer, in Citadel's long-lived client.
internal final class TermforgeDeferredAuthentication: NIOSSHClientUserAuthenticationDelegate, @unchecked Sendable {
  private let lease: TermforgeTrustLease
  private let isKey: Bool
  private let provider: @Sendable () async throws -> NIOSSHUserAuthenticationOffer
  init(lease: TermforgeTrustLease, isKey: Bool, provider: @escaping @Sendable () async throws -> NIOSSHUserAuthenticationOffer) {
    self.lease = lease; self.isKey = isKey; self.provider = provider
  }
  func nextAuthenticationType(availableMethods: NIOSSHAvailableUserAuthenticationMethods, nextChallengePromise: EventLoopPromise<NIOSSHUserAuthenticationOffer?>) {
    guard availableMethods.contains(isKey ? .publicKey : .password) else {
      nextChallengePromise.fail(Exception(name: "AUTH_FAILED", description: "The selected authentication method is not supported by this server."))
      return
    }
    Task {
      do {
        try lease.beginAuthentication()
        try await lease.checkCurrent()
        let offer = try await provider()
        try await lease.checkCurrent()
        nextChallengePromise.succeed(offer)
      } catch { nextChallengePromise.fail(error) }
    }
  }
}
