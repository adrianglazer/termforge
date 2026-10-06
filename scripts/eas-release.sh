#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-}" in
  candidate)
    if [[ $# -ne 1 ]]; then echo 'Usage: npm run build:candidate' >&2; exit 2; fi
    npm run release:verify
    node scripts/release-source.js
    candidate_identity=$(node -p "require('./.release/source.json').sourceSha256")
    # Run release:check first. Upload this working tree without committing or
    # discarding other tasks. Never auto-submit or silently retry a failed job.
    eas build --platform ios --profile production --non-interactive --freeze-credentials \
      --no-wait --json --message "Task 08 source-sha256=$candidate_identity" > .release/candidate.json
    cat .release/candidate.json
    ;;
  testflight)
    if [[ $# -ne 2 || ! "$2" =~ ^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$ ]]; then
      echo 'Usage: npm run submit:testflight -- EXACT_EAS_BUILD_ID' >&2; exit 2
    fi
    node - <<'NODE'
const id = require('./eas.json').submit.production.ios.ascAppId;
if (typeof id !== 'string' || !/^\d+$/.test(id)) {
  console.error('Set the existing App Store Connect numeric Apple ID as submit.production.ios.ascAppId first.');
  process.exit(1);
}
NODE
    # Confirm compliance and inspect this exact finished candidate before upload.
    eas submit --platform ios --profile production --id "$2" --non-interactive --wait
    ;;
  *) echo 'Expected candidate or testflight.' >&2; exit 2 ;;
esac
