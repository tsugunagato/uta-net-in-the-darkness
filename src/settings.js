/* 設定の既定値（content script / popup / background で共有） */
(function (root) {
  'use strict';
  root.UtaDarkSettings = {
    DEFAULTS: {
      enabled: true,          // ダークモード
      dimImages: false,       // 画像を少し暗くする
      lyricsColumns: 'auto'   // 歌詞の段組み: 'off' | 'auto' | '2' | '3'
    },
    COLUMN_MODES: ['off', 'auto', '2', '3']
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
