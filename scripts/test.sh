#!/bin/sh
# 色変換のユニットテスト。Node があれば Node、なければ macOS の osascript (JavaScriptCore) で実行する。
cd "$(dirname "$0")/.." || exit 1
if command -v node >/dev/null 2>&1; then
  exec node test/color.test.js
fi
out=$( { cat src/color.js test/color.test.js; printf '%s\n' '__testOutput.text + String.fromCharCode(10) + "#FAILED=" + __testOutput.failed'; } | osascript -l JavaScript - 2>&1)
printf '%s\n' "$out" | grep -v '^#FAILED='
printf '%s\n' "$out" | grep -q '^#FAILED=0$'
