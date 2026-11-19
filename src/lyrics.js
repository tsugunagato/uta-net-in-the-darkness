/*
 * 歌詞の段組み。
 * 歌詞の要素（#kashi_area）には一切手を加えず、<html> に data-utadark-cols="N" を付けて
 * CSS の column-count で列数を変えるだけ（スタイルは content.css）。
 *
 * 'auto' のときは、1画面（ヘッダー分を除いた高さ）に収まる最小の列数を 1〜3 の中から選ぶ。
 * 列幅が狭くなりすぎる（MIN_COL_WIDTH 未満）列数は選ばない。
 */
(function () {
  'use strict';
  // content.css の段組みセレクタと揃えること
  const SELECTORS = [
    '#kashi_area',                                                   // 歌詞ページ /song/
    '.movie-page .kashi > .col-12 > div:not([class]):not([id])'      // 動画ページ /movie/
  ];
  const ATTR = 'data-utadark-cols';
  const MIN_VIEWPORT = 768;     // これより狭い画面（スマホ表示）では段組みしない
  const MIN_COL_WIDTH = 220;    // px
  const HEADER_ALLOWANCE = 140; // 固定ヘッダー等のぶん
  const root = document.documentElement;
  let mode = 'off';

  const target = () => SELECTORS.map((s) => document.querySelector(s)).find(Boolean) || null;

  function setCols(n) {
    if (n > 1) root.setAttribute(ATTR, String(n));
    else root.removeAttribute(ATTR);
  }

  function layout() {
    const el = target();
    if (!el || mode === 'off' || window.innerWidth < MIN_VIEWPORT) { setCols(1); return; }
    if (mode === '2' || mode === '3') { setCols(+mode); return; }

    // auto
    setCols(1);
    const width = el.clientWidth;
    const avail = Math.max(320, window.innerHeight - HEADER_ALLOWANCE);
    let chosen = 1;
    for (let n = 1; n <= 3; n++) {
      if (n > 1 && width / n < MIN_COL_WIDTH) break;
      setCols(n);
      chosen = n;
      if (el.getBoundingClientRect().height <= avail) break;
    }
    setCols(chosen);
  }

  let timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(layout, 150);
  }

  function setMode(m) {
    mode = m;
    if (document.readyState === 'loading') return; // DOMContentLoaded で実行
    layout();
  }

  document.addEventListener('DOMContentLoaded', layout);
  window.addEventListener('load', layout);          // Web フォント読み込み後の高さで再計算
  window.addEventListener('resize', schedule);

  globalThis.UtaDarkLyrics = { setMode, layout };
})();
