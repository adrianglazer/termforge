import UIKit
import LocalAuthentication
internal import ExpoModulesCore

/// One native-only secret prompt. Backgrounding cancels its continuation exactly once.
@MainActor
internal final class TermforgeCredentialPrompt {
  static let shared = TermforgeCredentialPrompt()
  private var completion: ((Result<String, Error>) -> Void)?
  private weak var alert: UIAlertController?
  private var owner: String?
  private var timeout: Task<Void, Never>?
  private var backgroundObserver: NSObjectProtocol?

  private init() {
    backgroundObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main
    ) { [weak self] _ in
      Task { @MainActor in self?.cancel() }
    }
  }

  func request(title: String, message: String, sessionId: String? = nil) async throws -> String {
    guard completion == nil,
          UIApplication.shared.applicationState == .active,
          let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
          var presenter = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
      throw Exception(name: "KEY_LOCKED", description: "Credential entry is unavailable right now.")
    }
    if let sessionId, !TermforgeSessionRegistry.shared.contains(id: sessionId) { throw CancellationError() }
    while let presented = presenter.presentedViewController { presenter = presented }
    return try await withCheckedThrowingContinuation { continuation in
      owner = sessionId
      completion = { continuation.resume(with: $0) }
      timeout = Task { @MainActor [weak self] in
        do { try await Task.sleep(for: .seconds(120)) } catch { return }
        self?.cancel()
      }
      let controller = UIAlertController(title: title, message: message, preferredStyle: .alert)
      controller.addTextField { field in
        field.isSecureTextEntry = true
        field.autocorrectionType = .no
        field.autocapitalizationType = .none
        field.textContentType = .password
      }
      controller.addAction(UIAlertAction(title: "Cancel", style: .cancel) { [weak self] _ in
        self?.cancel()
      })
      controller.addAction(UIAlertAction(title: "Continue", style: .default) { [weak self, weak controller] _ in
        let value = controller?.textFields?.first?.text ?? ""
        if value.utf8.count > 4096 {
          self?.finish(.failure(Exception(name: "RESOURCE_LIMIT", description: "The credential is too long.")))
        } else { self?.finish(.success(value)) }
      })
      alert = controller
      presenter.present(controller, animated: true)
    }
  }

  private func finish(_ result: Result<String, Error>) {
    let callback = completion
    completion = nil
    owner = nil
    timeout?.cancel(); timeout = nil
    alert?.textFields?.forEach { $0.text = nil }
    alert = nil
    callback?(result)
  }

  func cancel(sessionId: String) { if owner == sessionId { cancel() } }

  func cancel() {
    alert?.dismiss(animated: false)
    finish(.failure(Exception(name: "CANCELLED", description: "Credential entry was cancelled.")))
  }
}

/// Keychain reads can block off the main actor. Invalidate all active contexts
/// on background without moving SecItemCopyMatching onto the UI thread.
internal final class TermforgeKeyAccess: @unchecked Sendable {
  static let shared = TermforgeKeyAccess()
  private let lock = NSLock()
  private var contexts: [(LAContext, String?)] = []
  func begin(_ context: LAContext, sessionId: String?) { lock.lock(); defer { lock.unlock() }; contexts.append((context, sessionId)) }
  func finish(_ context: LAContext) {
    lock.lock(); defer { lock.unlock() }
    contexts.removeAll { $0.0 === context }
    context.invalidate()
  }
  func cancel(sessionId: String) {
    lock.lock(); defer { lock.unlock() }
    contexts.filter { $0.1 == sessionId }.forEach { $0.0.invalidate() }
    contexts.removeAll { $0.1 == sessionId }
  }
  func cancel() {
    lock.lock(); defer { lock.unlock() }
    contexts.forEach { $0.0.invalidate() }
    contexts.removeAll()
  }
}
