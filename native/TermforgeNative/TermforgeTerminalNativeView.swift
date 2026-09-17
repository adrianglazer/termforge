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

  internal func sendSemanticKey(_ key: String) throws {
    let bytes: [UInt8]
    switch key {
    case "escape": bytes = [0x1b]
    case "tab": bytes = [0x09]
    case "ctrlC": bytes = [0x03]
    case "ctrlD": bytes = [0x04]
    case "up": bytes = Array((terminal.getTerminal().applicationCursor ? "\u{1b}OA" : "\u{1b}[A").utf8)
    case "down": bytes = Array((terminal.getTerminal().applicationCursor ? "\u{1b}OB" : "\u{1b}[B").utf8)
    case "right": bytes = Array((terminal.getTerminal().applicationCursor ? "\u{1b}OC" : "\u{1b}[C").utf8)
    case "left": bytes = Array((terminal.getTerminal().applicationCursor ? "\u{1b}OD" : "\u{1b}[D").utf8)
    case "f1": bytes = Array("\u{1b}OP".utf8)
    case "f2": bytes = Array("\u{1b}OQ".utf8)
    case "f3": bytes = Array("\u{1b}OR".utf8)
    case "f4": bytes = Array("\u{1b}OS".utf8)
    case "f5": bytes = Array("\u{1b}[15~".utf8)
    case "f6": bytes = Array("\u{1b}[17~".utf8)
    case "f7": bytes = Array("\u{1b}[18~".utf8)
    case "f8": bytes = Array("\u{1b}[19~".utf8)
    case "f9": bytes = Array("\u{1b}[20~".utf8)
    case "f10": bytes = Array("\u{1b}[21~".utf8)
    case "f11": bytes = Array("\u{1b}[23~".utf8)
    case "f12": bytes = Array("\u{1b}[24~".utf8)
    default: throw Exception(name: "INVALID_KEY", description: "Unsupported terminal key.")
    }
    terminal.send(data: bytes[...])
  }

  internal func search(term: String, direction: String, caseSensitive: Bool) -> [String: Int] {
    guard !term.isEmpty else { terminal.clearSearch(); return ["index": 0, "total": 0] }
    let options = SearchOptions(caseSensitive: caseSensitive)
    if direction == "previous" { terminal.findPrevious(term, options: options) }
    else { terminal.findNext(term, options: options) }
    let result = terminal.searchMatchSummary(term, options: options, limit: 1_000)
    return ["index": result.index, "total": result.total]
  }

  internal func clearScrollback() { terminal.clearScrollback() }
  internal func setFontSize(_ value: Double) {
    terminal.font = UIFont.monospacedSystemFont(ofSize: min(32, max(8, value)), weight: .regular)
  }
  internal func setScrollback(_ value: Int) { terminal.changeScrollback(min(100_000, max(1_000, value))) }
  internal func setForegroundColor(_ value: String) { if let color = UIColor(termforgeHex: value) { terminal.nativeForegroundColor = color } }
  internal func setBackgroundColor(_ value: String) { if let color = UIColor(termforgeHex: value) { terminal.nativeBackgroundColor = color; backgroundColor = color } }

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
  func clipboardCopy(source: TerminalView, content: Data) {
    UIPasteboard.general.string = String(data: content, encoding: .utf8)
  }
  func clipboardRead(source: TerminalView) -> Data? {
    UIPasteboard.general.string?.data(using: .utf8)
  }
  func iTermContent(source: TerminalView, content: ArraySlice<UInt8>) {}
  func rangeChanged(source: TerminalView, startY: Int, endY: Int) {}
}

private extension UIColor {
  convenience init?(termforgeHex value: String) {
    let clean = value.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    guard clean.count == 6, let number = UInt64(clean, radix: 16) else { return nil }
    self.init(red: CGFloat((number >> 16) & 0xff) / 255, green: CGFloat((number >> 8) & 0xff) / 255, blue: CGFloat(number & 0xff) / 255, alpha: 1)
  }
}
