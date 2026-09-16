import ExpoModulesCore

public class TermforgeSshModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TermforgeSsh")

    Events("onChange")

    AsyncFunction("setValueAsync") { (value: String) in
      self.sendEvent("onChange", [
        "value": value
      ])
    }
  }
}
