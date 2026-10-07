import UIKit
import LocalAuthentication
internal import ExpoModulesCore

@MainActor
internal final class TermforgeAppLock: NSObject {
  static let shared = TermforgeAppLock()
  private(set) var locked = false
  private(set) var revision = 0
  var changed: ((Bool, Int) -> Void)?
  var teardown: (() -> Void)?
  private var installed = false
  private var observers: [NSObjectProtocol] = []
  private var covers: [UIView] = []
  private var gestures: [TermforgeActivityGesture] = []
  private var idleSeconds: TimeInterval = 300
  private var lastActivity = ProcessInfo.processInfo.systemUptime
  private var timer: Timer?
  private var unlockContext: LAContext?
  private var pendingUnlockPublication = false

  func install(teardown: @escaping () -> Void) {
    self.teardown = teardown
    guard !installed else { return }
    installed = true
    observe(UIApplication.willResignActiveNotification) { self.cover() }
    observe(UIApplication.didBecomeActiveNotification) {
      self.installActivityObservers()
      if self.locked { self.cover() } else {
        self.uncover()
        if self.pendingUnlockPublication { self.pendingUnlockPublication = false; self.changed?(false, self.revision) }
      }
    }
    observe(UIApplication.didEnterBackgroundNotification) { self.lock() }
    observe(UIApplication.protectedDataWillBecomeUnavailableNotification) { self.lock() }
    observe(UITextField.textDidChangeNotification) { self.recordActivity() }
    observe(UITextView.textDidChangeNotification) { self.recordActivity() }
    installActivityObservers()
    timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
      MainActor.assumeIsolated {
        if !self.locked, ProcessInfo.processInfo.systemUptime - self.lastActivity >= self.idleSeconds { self.lock() }
      }
    }
  }

  private func observe(_ name: Notification.Name, action: @escaping @MainActor () -> Void) {
    observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { _ in
      MainActor.assumeIsolated { action() }
    })
  }

  func setIdleMinutes(_ minutes: Int) throws {
    guard (1...30).contains(minutes) else {
      throw Exception(name: "INVALID_CONFIG", description: "Choose a supported auto-lock duration.")
    }
    idleSeconds = TimeInterval(minutes * 60)
  }

  func recordActivity() {
    guard !locked, UIApplication.shared.applicationState == .active else { return }
    lastActivity = ProcessInfo.processInfo.systemUptime
  }

  func requireUnlocked() throws {
    guard !locked, UIApplication.shared.applicationState == .active else {
      throw Exception(name: "KEY_LOCKED", description: "Unlock Termforge before continuing.")
    }
  }

  /// LocalAuthentication can return before UIKit finishes becoming active.
  /// Wait for that transition without authorizing work after a real lock/background.
  func waitUntilActive() async throws {
    let expectedRevision = revision
    let deadline = ProcessInfo.processInfo.systemUptime + 10
    while true {
      try Task.checkCancellation()
      guard !locked, revision == expectedRevision,
            UIApplication.shared.applicationState != .background else {
        throw CancellationError()
      }
      if UIApplication.shared.applicationState == .active { return }
      guard ProcessInfo.processInfo.systemUptime < deadline else {
        throw Exception(name: "KEY_LOCKED", description: "Return to Termforge and try connecting again.")
      }
      try await Task<Never, Never>.sleep(for: .milliseconds(50))
    }
  }

  func lock() {
    unlockContext?.invalidate(); unlockContext = nil
    pendingUnlockPublication = false
    let firstLock = !locked
    locked = true
    uncover(); cover()
    TermforgeCredentialPrompt.shared.cancel()
    TermforgeKeyAccess.shared.cancel()
    TermforgeFilePicker.shared.cancel()
    TermforgeFileAccess.shared.invalidate()
    teardown?()
    if firstLock { revision += 1; changed?(true, revision) }
  }

  private func installActivityObservers() {
    for scene in UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }) {
      for window in scene.windows where !gestures.contains(where: { $0.view === window }) {
        let gesture = TermforgeActivityGesture(target: nil, action: nil)
        gesture.cancelsTouchesInView = false
        gesture.delaysTouchesBegan = false
        gesture.delaysTouchesEnded = false
        window.addGestureRecognizer(gesture)
        gestures.append(gesture)
      }
    }
  }

  private func cover() {
    guard covers.isEmpty else { return }
    for scene in UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }) {
      for window in scene.windows where window.isKeyWindow {
        let view = UIView(frame: window.bounds)
        view.backgroundColor = .black
        view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        if locked {
          let button = UIButton(type: .system)
          button.setTitle("Unlock Termforge", for: .normal)
          button.accessibilityLabel = "Unlock Termforge with Face ID or device passcode"
          button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
          button.translatesAutoresizingMaskIntoConstraints = false
          button.addTarget(self, action: #selector(unlock), for: .touchUpInside)
          view.addSubview(button)
          NSLayoutConstraint.activate([button.centerXAnchor.constraint(equalTo: view.centerXAnchor), button.centerYAnchor.constraint(equalTo: view.centerYAnchor)])
        }
        window.addSubview(view); covers.append(view)
      }
    }
  }

  private func uncover() { covers.forEach { $0.removeFromSuperview() }; covers.removeAll() }

  @objc private func unlock() {
    guard locked, unlockContext == nil, UIApplication.shared.applicationState == .active else { return }
    let context = LAContext()
    unlockContext = context
    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock your terminal workspace.") { success, _ in
      Task { @MainActor in
        guard self.unlockContext === context else { return }
        self.unlockContext = nil
        guard success else { return }
        // Authentication may finish during inactive; background always invalidates
        // this context, so a later backgrounded result cannot unlock the app.
        guard UIApplication.shared.applicationState != .background else { return }
        self.locked = false
        self.lastActivity = ProcessInfo.processInfo.systemUptime
        self.revision += 1
        self.uncover()
        if UIApplication.shared.applicationState == .active { self.changed?(false, self.revision) }
        else { self.pendingUnlockPublication = true }
      }
    }
  }
}

@MainActor
private final class TermforgeActivityGesture: UIGestureRecognizer {
  override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
    TermforgeAppLock.shared.recordActivity()
    state = .failed // Observe without competing with selection, scrolling or typing.
  }
}
