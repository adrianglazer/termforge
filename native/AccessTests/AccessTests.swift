import XCTest
@testable import TermforgeAccessCore

final class AccessTests: XCTestCase {
  private let start: TimeInterval = 1_800_000_000
  private func transaction(_ product: String, _ date: TimeInterval, original: TimeInterval? = nil, revoked: Bool = false) -> TermforgeAccessTransaction {
    .init(productID: product, purchaseDate: date, originalPurchaseDate: original ?? date, revoked: revoked)
  }
  private func decide(_ current: [TermforgeAccessTransaction] = [], history: [TermforgeAccessTransaction] = [],
                      now: TimeInterval? = nil, failed: Bool = false, clock: Bool = false) -> TermforgeAccessDecision {
    TermforgeAccessModel.decide(current: current, history: history, now: now ?? start,
      verificationFailed: failed, clockFailed: clock)
  }
  func testLoadingAndNoTransactionNeverAuthorize() {
    XCTAssertFalse(TermforgeAccessState.loading.allowsRemoteWork)
    XCTAssertEqual(decide().state, .notStarted)
    XCTAssertFalse(decide().state.allowsRemoteWork)
    // Cancelled/pending/failed transactions deliver no verified transaction.
    for _ in ["cancelled", "pending", "failed", "missing product", "offline fresh install"] {
      XCTAssertEqual(decide().state, .notStarted)
    }
  }
  func testExactBoundaryIs168HoursIndependentOfTimeZone() {
    let trial = transaction(TermforgeAccessModel.trialID, start)
    let end = start + 604_800
    XCTAssertEqual(decide([trial], now: end - 0.001).state, .trial)
    XCTAssertEqual(decide([trial], now: end).state, .expired)
    XCTAssertEqual(decide([trial], now: end + 0.001).state, .expired)
    XCTAssertEqual(decide([trial]).expiresAt, end)
  }
  func testRestoreReinstallNewDeviceUseOriginalEarliestDate() {
    let original = transaction(TermforgeAccessModel.trialID, start)
    let restored = transaction(TermforgeAccessModel.trialID, start + 700_000, original: start)
    XCTAssertEqual(decide([restored], now: start + 700_000).state, .expired)
    let repurchased = transaction(TermforgeAccessModel.trialID, start + 700_000)
    let revoked = transaction(TermforgeAccessModel.trialID, start, revoked: true)
    XCTAssertEqual(decide([repurchased], history: [revoked, original], now: start + 700_000).state, .expired)
  }
  func testLifetimePrecedenceAndRevocation() {
    let trial = transaction(TermforgeAccessModel.trialID, start)
    let paid = transaction(TermforgeAccessModel.lifetimeID, start)
    XCTAssertEqual(decide([paid, trial], now: start + 900_000, clock: true).state, .lifetime)
    XCTAssertEqual(decide([paid], failed: true).state, .lifetime)
    let refunded = transaction(TermforgeAccessModel.lifetimeID, start, revoked: true)
    XCTAssertEqual(decide([refunded, trial]).state, .trial)
    XCTAssertEqual(decide([refunded, trial], now: start + 604_800).state, .expired)
    XCTAssertFalse(decide([refunded]).state.allowsRemoteWork)
  }
  func testVerificationFailuresAndUnexpectedProductsFailClosed() {
    let trial = transaction(TermforgeAccessModel.trialID, start)
    XCTAssertEqual(decide([trial], now: start - 1).state, .error)
    XCTAssertEqual(decide([trial], failed: true).state, .error)
    XCTAssertEqual(decide([trial], clock: true).state, .error)
    XCTAssertEqual(decide([transaction("unexpected", start)]).state, .notStarted)
    XCTAssertFalse(decide(failed: true).state.allowsRemoteWork)
  }
  func testOfflineUsesSameVerifiedDatesAndExpiresWithoutCatalog() {
    let trial = transaction(TermforgeAccessModel.trialID, start)
    XCTAssertEqual(decide([trial], now: start + 500).state, .trial)
    XCTAssertEqual(decide([trial], now: start + 604_800).state, .expired)
    XCTAssertEqual(decide([transaction(TermforgeAccessModel.lifetimeID, start)]).state, .lifetime)
    XCTAssertEqual(decide([], history: [trial], now: start + 100).state, .expired)
  }
  func testMonotonicRollbackAndCorrectionRecovery() {
    var clock = TermforgeAccessClock(lastObserved: start, wall: start, uptime: 10)
    let back = clock.observe(wall: start - 3600, uptime: 70)
    XCTAssertEqual(back.now, start + 60)
    XCTAssertTrue(back.suspicious)
    let corrected = clock.observe(wall: start + 61, uptime: 71)
    XCTAssertFalse(corrected.suspicious)
    XCTAssertEqual(corrected.now, start + 61)
    var reopen = TermforgeAccessClock(lastObserved: start + 61, wall: start - 3600, uptime: 1)
    XCTAssertTrue(reopen.observe(wall: start - 3600, uptime: 2).suspicious)
    XCTAssertFalse(reopen.observe(wall: start + 63, uptime: 3).suspicious)
  }
  func testExplicitClockReanchorNeverCreatesOrRestartsAnEntitlement() {
    // The adapter may re-anchor only after explicit successful AppStore.sync().
    var corrected = TermforgeAccessClock(lastObserved: start, wall: start, uptime: 1)
    let now = corrected.observe(wall: start + 1, uptime: 2).now
    XCTAssertEqual(decide(now: now).state, .notStarted)
    let old = transaction(TermforgeAccessModel.trialID, start - 604_800)
    XCTAssertEqual(decide([old], now: now).state, .expired)
  }
  func testForwardJumpCannotExtendClockAndExpirationDisallowsAllRemoteWork() {
    var clock = TermforgeAccessClock(lastObserved: start, wall: start, uptime: 10)
    let jump = clock.observe(wall: start + 604_800, uptime: 11)
    let trial = transaction(TermforgeAccessModel.trialID, start)
    XCTAssertFalse(decide([trial], now: jump.now).state.allowsRemoteWork)
    for state in [TermforgeAccessState.notStarted, .loading, .expired, .error] {
      XCTAssertFalse(state.allowsRemoteWork)
    }
    XCTAssertTrue(TermforgeAccessState.trial.allowsRemoteWork)
    XCTAssertTrue(TermforgeAccessState.lifetime.allowsRemoteWork)
  }
}
