import ExpoModulesCore

public class TermforgeTerminalModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TermforgeTerminal")

    AsyncFunction("setValueAsync") { (value: String) in
    }

    View(TermforgeTerminalView.self) {
      Events("onTap")
    }
  }
}
