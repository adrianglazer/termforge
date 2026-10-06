import Foundation

/// A streaming admission gate, not a terminal emulator. Only complete bounded
/// control sequences reach SwiftTerm. Graphics, DCS/APC/PM/SOS and OSC clipboard
/// commands are unavailable; ordinary UTF-8, CSI, color and title commands remain.
internal struct TermforgeOutputGate {
  private enum State { case ground, escape, csi, osc, discardString, discardCSI }
  private var state: State = .ground
  private var pending: [UInt8] = []
  private var escaped = false
  private var utf8Remaining = 0
  private var utf8Lead: UInt8 = 0
  private var heldC2 = false
  static let maximumSequenceBytes = 4096
  var retainedByteCount: Int { pending.count + (heldC2 ? 1 : 0) }

  mutating func filter(_ bytes: [UInt8]) -> [UInt8] {
    var output: [UInt8] = []
    output.reserveCapacity(bytes.count)
    for byte in bytes { admit(byte, into: &output) }
    return output
  }

  private mutating func begin(_ next: State, prefix: [UInt8]) {
    state = next; pending = prefix; escaped = false; utf8Remaining = 0
  }

  private mutating func admit(_ byte: UInt8, into output: inout [UInt8]) {
    if state == .ground {
      if heldC2 {
        heldC2 = false
        // Encoded C1 controls must not bypass the admission policy.
        if (0x80...0x9f).contains(byte) { control(byte, into: &output); return }
        output.append(0xc2)
      }
      if utf8Remaining > 0 {
        if (0x80...0xbf).contains(byte) {
          // Prevent overlong UTF-8 from smuggling C0/C1 sequences.
          let validFirst = !(utf8Lead == 0xe0 && byte < 0xa0) && !(utf8Lead == 0xf0 && byte < 0x90)
          utf8Lead = 0
          if validFirst { output.append(byte); utf8Remaining -= 1; return }
        }
        utf8Remaining = 0; utf8Lead = 0
      }
      if byte == 0xc2 { heldC2 = true; return }
      if (0xc3...0xdf).contains(byte) { utf8Remaining = 1 }
      else if (0xe0...0xef).contains(byte) { utf8Remaining = 2; utf8Lead = byte }
      else if (0xf0...0xf4).contains(byte) { utf8Remaining = 3; utf8Lead = byte }
      if byte == 0x1b { begin(.escape, prefix: [byte]) }
      else if (0x80...0x9f).contains(byte) { control(byte, into: &output) }
      else { output.append(byte) }
      return
    }

    if state == .osc || state == .discardString {
      if byte == 0x18 || byte == 0x1a || byte == 0x9c || (escaped && byte == 0x5c) || byte == 0x07 {
        if state == .osc && byte != 0x18 && byte != 0x1a {
          if escaped { pending.removeLast() }
          if allowedOSC() { output += pending; output += [0x1b, 0x5c] }
        }
        begin(.ground, prefix: [])
        return
      }
      if escaped {
        // An embedded ESC that is not ST cancels the control string. Reprocess
        // it as a new escape sequence instead of leaking discarded contents.
        begin(.escape, prefix: [0x1b]); admit(byte, into: &output); return
      }
      escaped = byte == 0x1b
      if state == .osc {
        if pending.count < Self.maximumSequenceBytes { pending.append(byte) }
        else { pending.removeAll(keepingCapacity: true); state = .discardString }
      }
      return
    }

    if byte == 0x18 || byte == 0x1a { begin(.ground, prefix: []); return }
    if byte == 0x1b { begin(.escape, prefix: [byte]); return }
    if state == .discardCSI {
      if (0x40...0x7e).contains(byte) { begin(.ground, prefix: []) }
      return
    }
    if state == .escape {
      if pending.count == 1 {
        if byte == 0x5b { begin(.csi, prefix: [0x1b, byte]); return }
        if byte == 0x5d { begin(.osc, prefix: [0x1b, byte]); return }
        if [0x50, 0x58, 0x5e, 0x5f].contains(byte) { begin(.discardString, prefix: []); return }
      }
      if pending.count >= 32 { begin(.ground, prefix: []); return }
      pending.append(byte)
      if (0x30...0x7e).contains(byte) { output += pending; begin(.ground, prefix: []) }
      else if !(0x20...0x2f).contains(byte) { begin(.ground, prefix: []) }
      return
    }
    if state == .csi {
      if pending.count >= 256 { begin(.discardCSI, prefix: []); return }
      pending.append(byte)
      if (0x40...0x7e).contains(byte) {
        // Window manipulation and huge repeat/coordinate parameters are disabled.
        let numbers = String(decoding: pending.dropFirst(2).dropLast(), as: UTF8.self)
          .split(whereSeparator: { !$0.isNumber })
        if byte != 0x74 && numbers.count <= 24 && numbers.allSatisfy({ (Int($0) ?? Int.max) <= 4096 }) { output += pending }
        begin(.ground, prefix: [])
      } else if !(0x20...0x3f).contains(byte) { begin(.ground, prefix: []) }
    }
  }

  private mutating func control(_ byte: UInt8, into output: inout [UInt8]) {
    switch byte {
    case 0x9b: begin(.csi, prefix: [0x1b, 0x5b])
    case 0x9d: begin(.osc, prefix: [0x1b, 0x5d])
    case 0x90, 0x98, 0x9e, 0x9f: begin(.discardString, prefix: [])
    case 0x84: output += [0x1b, 0x44] // IND
    case 0x85: output += [0x1b, 0x45] // NEL
    case 0x88: output += [0x1b, 0x48] // HTS
    case 0x8d: output += [0x1b, 0x4d] // RI
    default: break
    }
  }

  private func allowedOSC() -> Bool {
    let payload = pending.dropFirst(2)
    guard let separator = payload.firstIndex(of: 0x3b),
          let command = Int(String(decoding: payload[..<separator], as: UTF8.self)) else { return false }
    return [0, 1, 2, 4, 10, 11, 12, 104, 110, 111, 112].contains(command)
  }
}
