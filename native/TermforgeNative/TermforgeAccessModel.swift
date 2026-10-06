import Foundation

/// Only the StoreKit adapter constructs these from verified Apple transactions.
internal struct TermforgeAccessTransaction: Sendable {
  let productID: String
  let purchaseDate: TimeInterval
  let originalPurchaseDate: TimeInterval
  let revoked: Bool
}

internal enum TermforgeAccessState: String, Sendable {
  case loading, notStarted, trial, expired, lifetime, error
  var allowsRemoteWork: Bool { self == .trial || self == .lifetime }
}

internal struct TermforgeAccessDecision: Equatable, Sendable {
  let state: TermforgeAccessState
  let trialStart: TimeInterval?
  var expiresAt: TimeInterval? { trialStart.map { $0 + TermforgeAccessModel.duration } }
}

internal enum TermforgeAccessModel {
  static let trialID = "com.adrianglazer.termforge.trial7days"
  static let lifetimeID = "com.adrianglazer.termforge.lifetime"
  static let duration: TimeInterval = 7 * 24 * 60 * 60

  static func decide(current: [TermforgeAccessTransaction], history: [TermforgeAccessTransaction],
                     now: TimeInterval, verificationFailed: Bool, clockFailed: Bool) -> TermforgeAccessDecision {
    if current.contains(where: { $0.productID == lifetimeID && !$0.revoked }) {
      return .init(state: .lifetime, trialStart: nil)
    }
    let dates = (history + current).filter { $0.productID == trialID }
      .flatMap { [$0.originalPurchaseDate, $0.purchaseDate] }
      .filter { $0.isFinite && $0 > 0 }
    let start = dates.min()
    if verificationFailed || clockFailed || !now.isFinite {
      return .init(state: .error, trialStart: start)
    }
    guard let start else { return .init(state: .notStarted, trialStart: nil) }
    guard now >= start else { return .init(state: .error, trialStart: start) }
    guard current.contains(where: { $0.productID == trialID && !$0.revoked }) else {
      return .init(state: .expired, trialStart: start)
    }
    return .init(state: now >= start + duration ? .expired : .trial, trialStart: start)
  }
}

/// A signed purchase date is not a trusted live clock. This only deters simple rollback.
internal struct TermforgeAccessClock {
  private(set) var highWater: TimeInterval
  private var anchor: TimeInterval
  private var uptime: TimeInterval
  init(lastObserved: TimeInterval, wall: TimeInterval, uptime: TimeInterval) {
    highWater = max(lastObserved, wall)
    anchor = highWater
    self.uptime = uptime
  }
  mutating func observe(wall: TimeInterval, uptime: TimeInterval) -> (now: TimeInterval, suspicious: Bool) {
    let monotonic = anchor + max(0, uptime - self.uptime)
    let now = max(wall, highWater, monotonic)
    let suspicious = wall < now - 120
    highWater = now
    anchor = now
    self.uptime = uptime
    return (now, suspicious)
  }
}
