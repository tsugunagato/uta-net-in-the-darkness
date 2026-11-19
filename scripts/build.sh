#!/bin/sh
# Chrome ウェブストア申請用の zip を dist/ に作る。
# zip の直下に manifest.json が来るようにし、拡張の動作に必要なファイルだけを入れる
# （test/ や scripts/、README などは入れない）。
set -e
cd "$(dirname "$0")/.."
version=$(python3 -I -c 'import json;print(json.load(open("manifest.json"))["version"])')
mkdir -p dist
out="dist/uta-net-in-the-darkness-$version.zip"
rm -f "$out"
zip -qrX "$out" manifest.json src popup icons -x '*.DS_Store'
echo "$out"
