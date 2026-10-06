#!/usr/bin/env bash
set -euo pipefail

# EAS is a headless CI worker, so Xcode cannot display its one-time trust dialog
# for SwiftTerm's build-tool plugin. Remote packages are locked and Citadel is
# the reviewed local patch. Verify provenance before allowing package plugins.
node ./scripts/verify-native-security.js
defaults write com.apple.dt.Xcode IDESkipPackagePluginFingerprintValidatation -bool YES
