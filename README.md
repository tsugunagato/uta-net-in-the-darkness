# Uta-Net in the Darkness

歌詞検索サイト「歌ネット」（uta-net.com）をダークモードで表示するブラウザ拡張機能です。長い歌詞を2〜3列に段組みする機能もあります。

> 歌ネットとは関係のない、非公式の拡張機能です。

## 機能

- **ダークモード**：トップ、歌詞、アーティスト・作詞者・作曲者、ランキング、特集、旧デザインの `/user/` 配下まで、サイト全体に効きます
- **歌詞の段組み**：オフ／自動／2列／3列から選べます。「自動」は、画面の高さに収まる最小の列数を1〜3列から選びます。幅768px未満の画面では段組みしません
- **画像を少し暗くする**（任意）
- ショートカット：`Alt+Shift+D` でダークモードのオン/オフ、`Alt+Shift+L` で段組みを切り替え（`chrome://extensions/shortcuts` で変更できます）

## インストール（開発版）

1. `chrome://extensions` を開き、右上の「デベロッパー モード」をオンにします
2. 「パッケージ化されていない拡張機能を読み込む」で、このリポジトリのフォルダを選びます

## 仕組み

旧版はページの部品ごとにセレクタを手書きしていたので、対応していないページや部品は白いまま残っていました。新版では、**ページが読み込んだ CSS から色の宣言を読み取り、同じセレクタのダーク版 CSS を自動生成**します。

```text
<style>（サイトの CSS）            .card { background:#fff; color:#212529 }
<style data-utadark-own>（生成）   .card { background-color:#171717; color:#c6ccd1 }
```

- 生成した CSS は元のスタイルシートの直後に挿入します。セレクタも `!important` も元と同じなので、ページの優先順位がそのまま保たれます
- 対象は `<style>`、`<link>`、`@media`、`@supports`、`@layer`、`@container`、`@import`、`@keyframes`、CSS ネスト、CSS 変数（`var(--x)`）、インライン `style` 属性、古いページの `bgcolor`・`<font color>`・`<body text link>`、SVG の `fill`・`stroke` です
- 後から追加された要素や CSS も `MutationObserver` で追従します
- 色は役割ごとに変換します。背景（明るい→暗い）、文字（暗い→明るい。暗背景に対してコントラスト比 4.5:1 以上を確保）、罫線、影の4種類で、色相は保つのでサイトの赤・紺などの配色はそのまま残ります

変換ロジックは [src/color.js](src/color.js)、CSS の走査と生成は [src/engine.js](src/engine.js) にあります。

## 歌ネットの利用規約への配慮

[ご利用規約](https://www.uta-net.com/info/kiyaku.html)の禁止事項（無断での複製・改変・編集・送信・スクレイピング等）に触れないよう、次の方針で作っています。

- 歌詞や本文のテキスト、DOM 構造は変更しません。拡張が DOM に加えるのは、ダーク用の `<style>` 要素と、色の指定を当てるための目印属性（`data-utadark-*`）だけです
- 段組みは `<html>` に属性を1つ付け、CSS の `column-count` で表示するだけです。歌詞の要素には何も足しません
- 歌ネットのサーバーへ追加のリクエストを送りません。ページがすでに読み込んだ CSS だけを読みます
- ページの内容を保存・抽出・送信する機能はありません
- 広告やクレジット表記を隠したり消したりしません

## 開発

```text
manifest.json
src/
  settings.js    設定の既定値
  color.js       色の解析と変換（純粋関数）
  engine.js      CSS の走査とダーク版の生成・挿入・追従
  lyrics.js      歌詞の段組み（列数の判定のみ）
  main.js        content script のエントリポイント
  content.css    下地・個別調整・段組みの CSS
  background.js  ショートカット
popup/           設定ポップアップ
test/
  color.test.js  色変換のテスト
  fixture.html   エンジンの動作確認ページ
scripts/
  test.sh        テスト実行
  build.sh       配布用 zip の作成
  make-icons.js  アイコンの描画（macOS の JXA / AppKit）
```

- テスト：`./scripts/test.sh`（Node があれば Node、なければ macOS 標準の JavaScriptCore で動きます）
- 動作確認ページ：リポジトリのルートで `python3 -m http.server 8766` を実行し、`http://localhost:8766/test/fixture.html` を開きます（`?off` で変換前の表示、`?cols=2` で段組みの指定）
- Chrome ウェブストア申請用 zip：`./scripts/build.sh` で `dist/uta-net-in-the-darkness-<version>.zip` に出力されます。再申請のときは `manifest.json` の `version` を上げてから作ります
- アイコン：`osascript -l JavaScript scripts/make-icons.js icons` で `icons/` の PNG を描き直します（16/32px は三日月のみ、48/128px は音符つき）
