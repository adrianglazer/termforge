internal import Citadel
internal import ExpoModulesCore
internal import SwiftTerm

final class TermforgeNativeProbeModule: Module {
  func definition() -> ModuleDefinition {
    Name("TermforgeNativeProbe")

    Function("capabilities") {
      _ = TerminalView.self
      _ = SSHClient.self
      return [
        "terminal": "SwiftTerm 1.19.0",
        "ssh": "Citadel 0.12.1",
        "sftp": "Citadel 0.12.1",
        "platform": "iOS",
      ]
    }
  }
}
