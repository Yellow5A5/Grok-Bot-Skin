#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/macos/Grok Bot Skin.app"
BIN="$APP/Contents/MacOS/Grok Bot Skin"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
cp "$ROOT/macos/Info.plist" "$APP/Contents/Info.plist"
swiftc -O -parse-as-library \
  -framework AppKit \
  -framework ServiceManagement \
  -o "$BIN" \
  "$ROOT/macos/main.swift"
echo "built $APP"
