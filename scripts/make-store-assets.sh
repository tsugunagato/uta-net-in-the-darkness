#!/bin/sh
# Chrome ウェブストアに載せる画像を dist/store/ に書き出す（macOS + Google Chrome が必要）。
#   screenshot-1〜3.png … 1280×800（ストアが受け付けるのは 1280×800 か 640×400）
#   promo-small.png     … 440×280（小さいプロモーションタイル）
#
# 画面はすべて store/ の見本ページ（架空の曲・歌詞）に本物のエンジンを当てたもの。
# 実在サイトの歌詞や写真を掲載画像に載せないため。
# file:// のページから CSS を読めるよう --allow-file-access-from-files を付けて撮る（撮影用の一時プロファイルのみ）。
set -e
cd "$(dirname "$0")/.."
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
out=dist/store
mkdir -p "$out"
profile=$(mktemp -d)
trap 'rm -rf "$profile"' EXIT

shot() { # <html> <width> <height> <png>
  "$chrome" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
    --user-data-dir="$profile" --force-device-scale-factor=1 --allow-file-access-from-files \
    --window-size="$2,$3" --virtual-time-budget=4000 \
    --screenshot="$PWD/$4" "file://$PWD/$1" >/dev/null 2>&1
  echo "$4"
}

for i in 1 2 3; do shot "store/shot-$i.html" 1280 800 "$out/screenshot-$i.png"; done
shot store/promo-small.html 440 280 "$out/promo-small.png"

# ストアは透過 PNG を嫌うことがあるので、念のためサイズだけ確認しておく
for f in "$out"/*.png; do sips -g pixelWidth -g pixelHeight "$f" | awk 'NR>1{printf "%s ", $2} END{print ""}'; done
