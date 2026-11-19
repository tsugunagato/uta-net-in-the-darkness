#!/bin/sh
# 配布用 zip を dist/ に作る（Chrome ウェブストア / Firefox AMO 用）
set -e
cd "$(dirname "$0")/.."
version=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' manifest.json | head -1)
mkdir -p dist
out="dist/uta-net-in-the-darkness-$version.zip"
rm -f "$out"
zip -qr "$out" manifest.json src popup icons -x '.*' -x '*/.*'
echo "$out"
