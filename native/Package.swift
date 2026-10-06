// swift-tools-version: 6.0
import PackageDescription

// Portable tests execute the same admission code used by the iOS module.
let package = Package(
  name: "TermforgeSecurityChecks",
  products: [],
  dependencies: [
.package(url: "https://github.com/migueldeicaza/SwiftTerm.git", exact: "1.19.0"),
.package(path: "Vendor/Citadel"),
.package(url: "https://github.com/Wellz26/swift-nio-ssh.git", exact: "0.3.7"),
.package(url: "https://github.com/apple/swift-nio.git", exact: "2.102.0"),
.package(path: "Vendor/swift-crypto")
],
  targets: [
    .target(name: "TermforgeSecurityCore", path: "TermforgeNative",
      exclude: ["TermforgeNativeModule.swift", "TermforgeTerminalNativeView.swift", "TermforgeGlueHandler.swift", "TermforgeCredentialPrompt.swift", "TermforgeFileAccess.swift", "TermforgeAppLock.swift", "TermforgeCredentialInventory.swift", "TermforgeHostTrust.swift"],
      sources: ["TermforgeOutputGate.swift", "TermforgeKeyPreflight.swift"]),
    .testTarget(name: "TermforgeSecurityTests", dependencies: ["TermforgeSecurityCore"], path: "SecurityTests"),
    .target(name: "TermforgeNetworkSecurity", dependencies: [.product(name: "Citadel", package: "Citadel"), .product(name: "NIO", package: "swift-nio"), .product(name: "NIOSSH", package: "swift-nio-ssh")], path: "TermforgeNative",
      exclude: ["TermforgeNativeModule.swift", "TermforgeTerminalNativeView.swift", "TermforgeCredentialPrompt.swift", "TermforgeFileAccess.swift", "TermforgeAppLock.swift", "TermforgeCredentialInventory.swift", "TermforgeHostTrust.swift", "TermforgeOutputGate.swift", "TermforgeKeyPreflight.swift"], sources: ["TermforgeGlueHandler.swift"]),
    .testTarget(name: "TermforgeNetworkTests", dependencies: ["TermforgeNetworkSecurity", "TermforgeSecurityCore", .product(name: "Crypto", package: "swift-crypto"), .product(name: "Citadel", package: "Citadel"), .product(name: "NIO", package: "swift-nio"), .product(name: "NIOEmbedded", package: "swift-nio"), .product(name: "NIOSSH", package: "swift-nio-ssh")], path: "NetworkTests")
  ]
)
