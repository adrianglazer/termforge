import ExpoModulesCore

public class TermforgeSftpModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TermforgeSftp")

    Events("onChange")

    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }
  }
}
