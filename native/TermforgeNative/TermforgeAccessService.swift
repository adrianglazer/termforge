import Foundation
import StoreKit
import UIKit
internal import ExpoModulesCore

@MainActor
internal final class TermforgeAccessService {
  static let shared = TermforgeAccessService()
  var changed: (([String: Any]) -> Void)?
  var teardown: (() -> Void)?
  private var current: [TermforgeAccessTransaction] = []
  private var history: [TermforgeAccessTransaction] = []
  private var products: [String: Product] = [:]
  private var loaded = false
  private var verificationFailed = false
  private var clock: TermforgeAccessClock?
  private var clockUnavailable = false
  private var lastSaved: TimeInterval = 0
  private var decision = TermforgeAccessDecision(state: .loading, trialStart: nil)
  private var revision = 0
  private var busy = false
  private var outcome = "none"
  private var storeError = "none"
  private var updates: Task<Void, Never>?
  private var reloadRequest = 0
  private var reloadTask: Task<Void, Never>?
  private var timer: Timer?
  private var expiryTask: Task<Void, Never>?
  private var scheduledExpiry: TimeInterval?
  private var observer: NSObjectProtocol?
  private var previous: NSDictionary?

  func install() {
    guard updates == nil else { return }
    updates = Task { [weak self] in
      for await result in StoreKit.Transaction.updates {
        guard let self else { return }
        guard self.expected(result) else { continue }
        if case .verified(let transaction) = result, self.accepted(transaction), transaction.revocationDate != nil {
          self.current.removeAll { $0.productID == transaction.productID }
          self.recompute()
        }
        await self.reload()
        if case .unverified = result { self.outcome = "verificationFailed"; self.publish() }
        if case .verified(let transaction) = result, self.accepted(transaction) {
          await transaction.finish()
        }
      }
    }
    observer = NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification,
      object: nil, queue: .main) { _ in
        Task { @MainActor in
          self.recompute()
          await self.reload()
        }
      }
    timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
      MainActor.assumeIsolated {
        if UIApplication.shared.applicationState == .active { self.recompute() }
      }
    }
    Task { await reload(); await loadProducts() }
  }

  func snapshot() -> [String: Any] { install(); recompute(); return body() }

  func requireRemoteAccess() throws {
    install()
    recompute()
    guard decision.state.allowsRemoteWork else {
      throw Exception(name: "ACCESS_REQUIRED", description: "Open Access to start or restore a trial or lifetime purchase. Local data remains available.")
    }
  }

  func reload() async {
    reloadRequest += 1
    if let task = reloadTask { await task.value; return }
    let task = Task { @MainActor in
      var request: Int
      repeat {
        request = reloadRequest
        var entitlements: [TermforgeAccessTransaction] = []
        var trials: [TermforgeAccessTransaction] = []
        var failed = false
        for await result in StoreKit.Transaction.currentEntitlements {
          switch result {
          case .verified(let transaction):
            if accepted(transaction) { entitlements.append(record(transaction)) }
          case .unverified(let transaction, _):
            if isExpectedID(transaction.productID) { failed = true }
          }
        }
        // Include refunded acquisitions so repurchase cannot reset the original trial.
        for await result in StoreKit.Transaction.all {
          switch result {
          case .verified(let transaction):
            if accepted(transaction), transaction.productID == TermforgeAccessModel.trialID {
              trials.append(record(transaction))
            }
          case .unverified(let transaction, _):
            if transaction.productID == TermforgeAccessModel.trialID { failed = true }
          }
        }
        // A purchase/update arriving during enumeration must get a fresh snapshot.
        if request == reloadRequest {
          current = entitlements; history = trials; verificationFailed = failed; loaded = true
          recompute()
        }
      } while request != reloadRequest
      reloadTask = nil
    }
    reloadTask = task
    await task.value
  }

  func loadProducts() async {
    do {
      let fetched = try await Product.products(for: [TermforgeAccessModel.trialID, TermforgeAccessModel.lifetimeID])
      products = Dictionary(uniqueKeysWithValues: fetched.filter {
        $0.type == .nonConsumable && isExpectedID($0.id) &&
          ($0.id != TermforgeAccessModel.trialID || $0.price == 0)
      }.map { ($0.id, $0) })
      storeError = products.count == 2 ? "none" : "productsUnavailable"
    } catch { storeError = "storeUnavailable" }
    recompute()
  }

  func purchase(_ kind: String) async -> [String: Any] {
    guard !busy else { return snapshot() }
    guard kind == "trial" || kind == "lifetime" else { storeError = "invalidProduct"; return snapshot() }
    busy = true; outcome = "none"; publish()
    defer { busy = false; recompute() }
    await reload()
    if decision.state == .lifetime { outcome = "success"; return snapshot() }
    if kind == "trial", decision.trialStart != nil {
      outcome = "trialAlreadyUsed"; return snapshot()
    }
    if kind == "trial", decision.state == .error {
      outcome = "verificationFailed"; return snapshot()
    }
    let id = kind == "trial" ? TermforgeAccessModel.trialID : TermforgeAccessModel.lifetimeID
    if products[id] == nil || (kind == "trial" && products[TermforgeAccessModel.lifetimeID] == nil) { await loadProducts() }
    guard kind != "trial" || products[TermforgeAccessModel.lifetimeID] != nil else {
      outcome = "unavailable"; return snapshot()
    }
    guard let product = products[id] else { outcome = "unavailable"; return snapshot() }
    do {
      switch try await product.purchase() {
      case .success(let result):
        guard case .verified(let transaction) = result, accepted(transaction), transaction.productID == id,
              transaction.revocationDate == nil else {
          outcome = "verificationFailed"; await reload(); return snapshot()
        }
        await reload()
        outcome = decision.state.allowsRemoteWork ? "success" : "accessUnavailable"
        await transaction.finish()
      case .userCancelled: outcome = "cancelled"
      case .pending: outcome = "pending"
      @unknown default: outcome = "unavailable"
      }
    } catch { outcome = "storeUnavailable" }
    return snapshot()
  }

  func restore() async -> [String: Any] {
    guard !busy else { return snapshot() }
    busy = true; outcome = "none"; publish()
    defer { busy = false; recompute() }
    do {
      // Never invoked at startup or foreground; may request Apple authentication.
      try await AppStore.sync()
      await reload()
      // Explicit online synchronization plus corrected device time is the recovery path.
      // It is not a trusted-time service; do not claim tamper-proof enforcement.
      if decision.state == .error, !verificationFailed,
         Date().timeIntervalSince1970 >= (decision.trialStart ?? 0) {
        let wall = Date().timeIntervalSince1970
        do {
          try TermforgeAccessClockStorage.write(wall)
          clock = .init(lastObserved: wall, wall: wall, uptime: ProcessInfo.processInfo.systemUptime)
          clockUnavailable = false; lastSaved = wall
          recompute()
        } catch { clockUnavailable = true; recompute() }
      }
      outcome = decision.state.allowsRemoteWork ? "restored" : "noActivePurchase"
    } catch { outcome = "restoreFailed" }
    return snapshot()
  }

  private func recompute() {
    let wall = Date().timeIntervalSince1970
    let uptime = ProcessInfo.processInfo.systemUptime
    if clock == nil || clockUnavailable {
      do {
        let stored = try TermforgeAccessClockStorage.read()
        if clock == nil { clock = .init(lastObserved: stored, wall: wall, uptime: uptime) }
        clockUnavailable = false
      } catch { clockUnavailable = true }
    }
    let observation = clock?.observe(wall: wall, uptime: uptime)
    if let observation, loaded, wall - lastSaved >= 60 || lastSaved == 0 {
      do { try TermforgeAccessClockStorage.write(observation.now); lastSaved = wall }
      catch { clockUnavailable = true }
    }
    let old = decision
    decision = loaded ? TermforgeAccessModel.decide(current: current, history: history,
      now: observation?.now ?? wall, verificationFailed: verificationFailed,
      clockFailed: clockUnavailable || observation?.suspicious == true) : .init(state: .loading, trialStart: nil)
    if old.state.allowsRemoteWork && !decision.state.allowsRemoteWork { teardown?() }
    let expiry = decision.state == .trial ? decision.expiresAt : nil
    if expiry != scheduledExpiry {
      expiryTask?.cancel(); scheduledExpiry = expiry
      if let expiry {
        let remaining = max(0, expiry - (observation?.now ?? wall))
        expiryTask = Task { @MainActor in
          do { try await Task.sleep(for: .seconds(remaining)) } catch { return }
          self.scheduledExpiry = nil
          self.recompute()
        }
      }
    }
    publish()
  }

  private func body() -> [String: Any] {
    var value: [String: Any] = ["state": decision.state.rawValue, "revision": revision,
      "busy": busy, "outcome": outcome, "storeError": storeError,
      "trialAvailable": products[TermforgeAccessModel.trialID] != nil,
      "warning": decision.state == .trial && (decision.expiresAt ?? 0) - (clock?.highWater ?? 0) <= 300,
      "accessError": verificationFailed ? "verificationFailed" : clockUnavailable ? "clockStorageUnavailable" : decision.state == .error ? "clockChanged" : "none"]
    if let end = decision.expiresAt { value["expiresAt"] = end * 1000 }
    if let price = products[TermforgeAccessModel.lifetimeID]?.displayPrice { value["displayPrice"] = price }
    return value
  }
  private func publish() {
    let value = body() as NSDictionary
    guard previous != value else { return }
    revision += 1
    let next = body()
    previous = next as NSDictionary
    changed?(next)
  }
  private func isExpectedID(_ id: String) -> Bool {
    id == TermforgeAccessModel.trialID || id == TermforgeAccessModel.lifetimeID
  }
  private func accepted(_ transaction: StoreKit.Transaction) -> Bool {
    isExpectedID(transaction.productID) && transaction.productType == .nonConsumable && transaction.ownershipType == .purchased
  }
  private func expected(_ result: VerificationResult<StoreKit.Transaction>) -> Bool {
    switch result { case .verified(let t), .unverified(let t, _): return isExpectedID(t.productID) }
  }
  private func record(_ transaction: StoreKit.Transaction) -> TermforgeAccessTransaction {
    .init(productID: transaction.productID, purchaseDate: transaction.purchaseDate.timeIntervalSince1970,
      originalPurchaseDate: transaction.originalPurchaseDate.timeIntervalSince1970, revoked: transaction.revocationDate != nil)
  }
}
