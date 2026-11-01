#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BUILD="$ROOT/build/macos"
ARTIFACTS="$ROOT/artifacts"
APP_SOURCE="$ROOT/clients/macos/PresetKey.app"

rm -rf "$BUILD"
mkdir -p "$BUILD/root/Applications" "$ARTIFACTS"
ditto "$APP_SOURCE" "$BUILD/root/Applications/PresetKey.app"
chmod +x "$BUILD/root/Applications/PresetKey.app/Contents/MacOS/PresetKey"

pkgbuild --root "$BUILD/root" \
  --identifier "vn.presetkey.installer" \
  --version "1.0.0" \
  --install-location "/" \
  "$ARTIFACTS/PresetKey-CapCut-macOS-unsigned.pkg"

echo "Built $ARTIFACTS/PresetKey-CapCut-macOS-unsigned.pkg"
