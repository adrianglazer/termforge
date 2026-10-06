import Foundation
import Darwin
import UIKit
import UniformTypeIdentifiers
internal import ExpoModulesCore

/// Only native picker results and native-created downloads can mint capabilities.
/// No JS-supplied path grants authority. Capabilities expire on lock and after use.
internal final class TermforgeFileAccess: @unchecked Sendable {
  static let shared = TermforgeFileAccess()
  private struct Entry { let url: URL; let kind: String; let expires: Date }
  private let lock = NSLock()
  private var entries: [String: Entry] = [:]
  private var epoch = 0
  private var initialized = false
  private var staging = 0
  private var root: URL { FileManager.default.temporaryDirectory.appendingPathComponent("termforge-private", isDirectory: true) }

  func initialize() throws {
    lock.lock(); defer { lock.unlock() }
    guard !initialized else { return }
    let manager = FileManager.default
    // This directory contains only this service's disposable files, never originals.
    if manager.fileExists(atPath: root.path) { try manager.removeItem(at: root) }
    // Remove only disposable files created by earlier Termforge versions.
    for file in try manager.contentsOfDirectory(at: manager.temporaryDirectory, includingPropertiesForKeys: nil) {
      let name = file.lastPathComponent
      if name.hasPrefix("termforge-"), name.hasSuffix(".download"), UUID(uuidString: String(name.dropFirst(10).dropLast(9))) != nil { try manager.removeItem(at: file) }
    }
    if let cache = manager.urls(for: .cachesDirectory, in: .userDomainMask).first {
      let legacyPicker = cache.appendingPathComponent("DocumentPicker", isDirectory: true)
      if manager.fileExists(atPath: legacyPicker.path) { try manager.removeItem(at: legacyPicker) }
    }
    try manager.createDirectory(at: root, withIntermediateDirectories: true, attributes: [.protectionKey: FileProtectionType.complete])
    var directory = root
    var values = URLResourceValues(); values.isExcludedFromBackup = true
    try directory.setResourceValues(values)
    initialized = true
    scheduleExpiry()
  }

  private func scheduleExpiry() {
    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + 60) { [weak self] in
      guard let self else { return }
      self.lock.lock()
      let expired = self.entries.filter { $0.value.expires <= Date() }.map(\.key)
      for key in expired { if let entry = self.entries.removeValue(forKey: key) { try? FileManager.default.removeItem(at: entry.url) } }
      self.lock.unlock()
      self.scheduleExpiry()
    }
  }

  func invalidate() {
    lock.lock(); defer { lock.unlock() }
    epoch += 1
    entries.values.forEach { try? FileManager.default.removeItem(at: $0.url) }
    entries.removeAll()
  }

  func currentEpoch() -> Int { lock.lock(); defer { lock.unlock() }; return epoch }

  func temporaryFile() throws -> URL {
    try initialize()
    let url = root.appendingPathComponent(UUID().uuidString)
    guard FileManager.default.createFile(atPath: url.path, contents: nil, attributes: [.protectionKey: FileProtectionType.complete]) else {
      throw Exception(name: "PATH_REJECTED", description: "Protected temporary storage is unavailable.")
    }
    return url
  }

  func publish(_ url: URL, kind: String, epoch expectedEpoch: Int) throws -> String {
    lock.lock(); defer { lock.unlock() }
    guard epoch == expectedEpoch, entries.count < 8,
          url.deletingLastPathComponent().standardizedFileURL == root.standardizedFileURL else {
      try? FileManager.default.removeItem(at: url)
      throw Exception(name: "CANCELLED", description: "The file selection expired or temporary storage is full.")
    }
    let handle = UUID().uuidString
    entries[handle] = Entry(url: url, kind: kind, expires: Date().addingTimeInterval(600))
    return handle
  }

  func resolve(_ handle: String, kind: String, consume: Bool) throws -> URL {
    lock.lock(); defer { lock.unlock() }
    guard let entry = entries[handle], entry.kind == kind, entry.expires > Date() else {
      throw Exception(name: "PATH_REJECTED", description: "Select the file again; its permission expired.")
    }
    if consume { entries.removeValue(forKey: handle) }
    return entry.url
  }

  func discard(_ handle: String) {
    lock.lock(); defer { lock.unlock() }
    if let entry = entries.removeValue(forKey: handle) { try? FileManager.default.removeItem(at: entry.url) }
  }

  private func beginStaging() throws {
    lock.lock(); defer { lock.unlock() }
    guard staging < 2 else { throw Exception(name: "RESOURCE_LIMIT", description: "Wait for the current file selection to finish.") }
    staging += 1
  }
  private func finishStaging() { lock.lock(); defer { lock.unlock() }; staging -= 1 }

  func stage(_ selected: URL, kind: String, epoch expectedEpoch: Int) throws -> [String: String] {
    guard kind == "key" || kind == "upload" else { throw Exception(name: "INVALID_CONFIG", description: "Unsupported file selection.") }
    try beginStaging()
    defer { finishStaging() }
    let limit = kind == "key" ? 64 * 1024 : 256 * 1024 * 1024
    let scoped = selected.startAccessingSecurityScopedResource()
    defer { if scoped { selected.stopAccessingSecurityScopedResource() } }
    let destination = try temporaryFile()
    do {
      var coordinationError: NSError?
      var readingError: Error?
      var count = 0
      NSFileCoordinator().coordinate(readingItemAt: selected, options: [], error: &coordinationError) { coordinated in
        do {
          let values = try coordinated.resourceValues(forKeys: [.isRegularFileKey, .isSymbolicLinkKey])
          guard values.isRegularFile == true, values.isSymbolicLink != true else {
            throw Exception(name: "PATH_REJECTED", description: "Select a regular file, not a folder or symbolic link.")
          }
          let descriptor = open(coordinated.path, O_RDONLY | O_NOFOLLOW | O_NONBLOCK)
          guard descriptor >= 0 else { throw Exception(name: "PATH_REJECTED", description: "The selected file could not be opened.") }
          let input = FileHandle(fileDescriptor: descriptor, closeOnDealloc: true)
          var status = stat()
          guard fstat(descriptor, &status) == 0, (status.st_mode & S_IFMT) == S_IFREG else {
            try? input.close()
            throw Exception(name: "PATH_REJECTED", description: "The selected file is not a regular file.")
          }
          let output = try FileHandle(forWritingTo: destination)
          defer { try? input.close(); try? output.close() }
          while let data = try input.read(upToCount: min(64 * 1024, limit - count + 1)), !data.isEmpty {
            guard currentEpoch() == expectedEpoch else { throw CancellationError() }
            count += data.count
            guard count <= limit else { throw Exception(name: "RESOURCE_LIMIT", description: "The selected file exceeds the size limit.") }
            try output.write(contentsOf: data)
          }
        } catch { readingError = error }
      }
      if let error = coordinationError ?? (readingError as NSError?) { throw error }
      let handle = try publish(destination, kind: kind, epoch: expectedEpoch)
      return ["handle": handle, "name": selected.lastPathComponent, "bytes": String(count)]
    } catch {
      try? FileManager.default.removeItem(at: destination)
      throw error
    }
  }
}

@MainActor
internal final class TermforgeFilePicker: NSObject, UIDocumentPickerDelegate {
  static let shared = TermforgeFilePicker()
  private var completion: ((Result<URL, Error>) -> Void)?
  private weak var picker: UIDocumentPickerViewController?

  func pick() async throws -> URL {
    guard completion == nil, UIApplication.shared.applicationState == .active,
          let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive }),
          var presenter = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
      throw Exception(name: "CANCELLED", description: "File selection is unavailable right now.")
    }
    while let presented = presenter.presentedViewController { presenter = presented }
    return try await withCheckedThrowingContinuation { continuation in
      completion = { continuation.resume(with: $0) }
      let controller = UIDocumentPickerViewController(forOpeningContentTypes: [.item], asCopy: false)
      controller.allowsMultipleSelection = false
      controller.delegate = self
      picker = controller
      presenter.present(controller, animated: true)
    }
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    guard let url = urls.first else { cancel(); return }
    finish(.success(url))
  }
  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) { cancel() }
  func cancel() {
    picker?.dismiss(animated: false)
    finish(.failure(Exception(name: "CANCELLED", description: "File selection was cancelled.")))
  }
  private func finish(_ result: Result<URL, Error>) {
    let callback = completion; completion = nil; picker = nil
    callback?(result)
  }
}
