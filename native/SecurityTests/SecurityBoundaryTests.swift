import Foundation
import XCTest
@testable import TermforgeSecurityCore

final class SecurityBoundaryTests: XCTestCase {
  func testOrdinaryUnicodeAndTerminalSequencesSurviveEveryChunkBoundary() {
    let text = "shell 🙂 界 e\u{301}\r\n\u{1b}[38;2;1;2;3mgreen\u{1b}[0m\u{1b}[?2004h\u{1b}(B"
    let bytes = Array(text.utf8)
    for split in 0...bytes.count {
      var gate = TermforgeOutputGate()
      let output = gate.filter(Array(bytes[..<split])) + gate.filter(Array(bytes[split...]))
      XCTAssertEqual(output, bytes, "Split at \(split)")
      XCTAssertEqual(gate.retainedByteCount, 0)
    }
  }

  func testHostileControlStringsRemainBoundedAcrossChunksAndRecover() {
    for prefix in ["\u{1b}]52;", "\u{1b}P", "\u{1b}_", "\u{1b}]2;"] {
      var gate = TermforgeOutputGate()
      XCTAssertTrue(gate.filter(Array(prefix.utf8)).isEmpty)
      for _ in 0..<1000 {
        XCTAssertTrue(gate.filter([UInt8](repeating: 0x61, count: 1024)).isEmpty)
        XCTAssertLessThanOrEqual(gate.retainedByteCount, TermforgeOutputGate.maximumSequenceBytes)
      }
      XCTAssertEqual(gate.filter(Array("\u{1b}\\ok".utf8)), Array("ok".utf8))
    }
  }

  func testGraphicsClipboardAndC1CannotBypassAdmission() {
    let payloads: [[UInt8]] = [
      Array("\u{1b}]52;c;c2VjcmV0\u{7}".utf8),
      Array("\u{1b}]1337;File=huge:AAAA\u{7}".utf8),
      Array("\u{1b}Pq#huge-image\u{1b}\\".utf8),
      [0x9d] + Array("52;c;abc".utf8) + [0x9c],
      [0xc2, 0x9d] + Array("52;c;abc".utf8) + [0x07],
    ]
    for payload in payloads {
      for split in 0...payload.count {
        var gate = TermforgeOutputGate()
        XCTAssertTrue((gate.filter(Array(payload[..<split])) + gate.filter(Array(payload[split...]))).isEmpty)
        XCTAssertEqual(gate.filter(Array("next".utf8)), Array("next".utf8))
      }
    }
  }

  func testHugeCSIAndWindowResizeAreDroppedButNextTextSurvives() {
    for command in ["\u{1b}[999999999b", "\u{1b}[8;65535;65535t", "\u{1b}[" + String(repeating: "1;", count: 5000) + "m"] {
      var gate = TermforgeOutputGate()
      XCTAssertEqual(gate.filter(Array((command + "next").utf8)), Array("next".utf8))
      XCTAssertEqual(gate.retainedByteCount, 0)
    }
  }

  func testIncompleteSequencesAreRetainedOnlyWithinBudget() {
    var gate = TermforgeOutputGate()
    for byte in Array("\u{1b}[".utf8) + [UInt8](repeating: 0x31, count: 100000) {
      _ = gate.filter([byte])
      XCTAssertLessThanOrEqual(gate.retainedByteCount, 256)
    }
    XCTAssertEqual(gate.filter(Array("mhello".utf8)), Array("hello".utf8))
  }

  private func integer(_ value: UInt32) -> [UInt8] { [UInt8((value >> 24) & 255), UInt8((value >> 16) & 255), UInt8((value >> 8) & 255), UInt8(value & 255)] }
  private func blob(_ bytes: [UInt8]) -> [UInt8] { integer(UInt32(bytes.count)) + bytes }
  private func envelope(rounds: UInt32 = 16, salt: [UInt8] = [UInt8](repeating: 1, count: 16), encrypted: Bool = true, block: [UInt8] = [UInt8](repeating: 0, count: 16)) -> String {
    let options = encrypted ? blob(salt) + integer(rounds) : []
    let publicKey = blob(Array("ssh-ed25519".utf8)) + blob([UInt8](repeating: 0, count: 32))
    let bytes = Array("openssh-key-v1\0".utf8)
      + blob(Array((encrypted ? "aes256-ctr" : "none").utf8))
      + blob(Array((encrypted ? "bcrypt" : "none").utf8))
      + blob(options) + integer(1) + blob(publicKey) + blob(block)
    // Synthetic envelope only; the all-zero private block is not a usable key.
    return "-----BEGIN OPENSSH PRIVATE KEY-----\n" + Data(bytes).base64EncodedString() + "\n-----END OPENSSH PRIVATE KEY-----"
  }

  func testKeyPreflightBoundsKDFBeforeDecrypting() throws {
    XCTAssertTrue(try TermforgeKeyPreflight.encrypted(envelope()))
    XCTAssertFalse(try TermforgeKeyPreflight.encrypted(envelope(encrypted: false)))
    for rounds in [UInt32(0), 101, UInt32.max] { XCTAssertThrowsError(try TermforgeKeyPreflight.encrypted(envelope(rounds: rounds))) }
    XCTAssertThrowsError(try TermforgeKeyPreflight.encrypted(envelope(salt: [])))
    XCTAssertThrowsError(try TermforgeKeyPreflight.encrypted(envelope(block: [])))
    XCTAssertThrowsError(try TermforgeKeyPreflight.encrypted(envelope(block: [1])))
    XCTAssertThrowsError(try TermforgeKeyPreflight.encrypted(String(repeating: "x", count: 65537)))
    XCTAssertThrowsError(try TermforgeKeyPreflight.encrypted("-----BEGIN OPENSSH PRIVATE KEY-----AAAA-----END OPENSSH PRIVATE KEY-----"))
  }
}
