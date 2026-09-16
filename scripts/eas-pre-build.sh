#!/usr/bin/env bash
set -euo pipefail

# EAS is a headless CI worker, so Xcode cannot display its one-time trust dialog
# for SwiftTerm's build-tool plugin. Both native packages are exact-version pins
# in plugins/withTermforgeNativePackages.js; keep that invariant before allowing
# package plugins to execute on the build worker.
defaults write com.apple.dt.Xcode IDESkipPackagePluginFingerprintValidatation -bool YES
