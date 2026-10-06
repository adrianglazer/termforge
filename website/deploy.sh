#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "$0")"

for utility in docker gzip mktemp scp ssh; do
  if ! command -v "$utility" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$utility" >&2
    exit 127
  fi
done

archive=$(mktemp "$PWD/termforge-website-images-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX.tar.gz")
remote_archive="/tmp/${archive##*/}"
uploaded=false

cleanup() {
  local status=$?
  rm -f -- "$archive" || true
  if $uploaded; then
    ssh adrian "rm -f -- '$remote_archive'" || true
  fi
  return "$status"
}
trap cleanup EXIT

docker build -t termforge-website:latest .
docker save termforge-website:latest | gzip > "$archive"

# Clean up a partial upload too if scp fails.
uploaded=true
scp "$archive" "adrian:$remote_archive"
ssh adrian "docker load -i '$remote_archive'"
