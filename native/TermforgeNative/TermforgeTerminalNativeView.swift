internal import ExpoModulesCore
internal import SwiftTerm
import UIKit

@MainActor
internal final class TermforgeTerminalNativeView: ExpoView, TerminalViewDelegate {
  internal var sessionId: String?
  private let terminal = TerminalView(
    frame: .zero,
    font: UIFont.monospacedSystemFont(ofSize: 14, weight: .regular),
    options: TerminalOptions(scrollback: 10_000)
  )

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    clipsToBounds = true
    terminal.backgroundColor = .black
    terminal.terminalDelegate = self
    addSubview(terminal)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    terminal.frame = bounds
  }

  internal func feed(_ bytes: [UInt8]) { terminal.feed(byteArray: bytes[...]) }

  func sizeChanged(source: TerminalView, newCols: Int, newRows: Int) {
    guard let sessionId else { return }
    TermforgeSessionRegistry.shared.resize(id: sessionId, columns: newCols, rows: newRows, width: Int(bounds.width), height: Int(bounds.height))
  }
  func send(source: TerminalView, data: ArraySlice<UInt8>) {
    guard let sessionId else { return }
    TermforgeSessionRegistry.shared.write(id: sessionId, bytes: Array(data))
  }
  func setTerminalTitle(source: TerminalView, title: String) {
    guard let sessionId else { return }
    TermforgeSessionRegistry.shared.title(id: sessionId, value: title)
  }
  func hostCurrentDirectoryUpdate(source: TerminalView, directory: String?) {}
  func scrolled(source: TerminalView, position: Double) {}
  func requestOpenLink(source: TerminalView, link: String, params: [String: String]) {}
  func bell(source: TerminalView) {
    guard let sessionId else { return }
    TermforgeSessionRegistry.shared.bell(id: sessionId)
  }
  func clipboardCopy(source: TerminalView, content: Data) {}
  func clipboardRead(source: TerminalView) -> Data? { nil }
  func iTermContent(source: TerminalView, content: ArraySlice<UInt8>) {}
  func rangeChanged(source: TerminalView, startY: Int, endY: Int) {}
}
