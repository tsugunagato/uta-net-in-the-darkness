/* content script のエントリポイント。設定を読んでエンジンと段組みを動かす。 */
(function () {
  'use strict';
  const { DEFAULTS } = globalThis.UtaDarkSettings;
  const Engine = globalThis.UtaDarkEngine;
  const Lyrics = globalThis.UtaDarkLyrics;
  const root = document.documentElement;
  if (!root || !(document instanceof HTMLDocument)) return;

  let settings = { ...DEFAULTS };

  // 設定の読み込みは非同期なので、白いチラつきを防ぐためにまず「オン」で始める
  root.setAttribute('data-utadark', 'on');
  root.setAttribute('data-utadark-pending', '');
  Engine.start();

  function apply() {
    if (settings.enabled) {
      root.setAttribute('data-utadark', 'on');
      Engine.start();
    } else {
      root.removeAttribute('data-utadark');
      root.removeAttribute('data-utadark-pending');
      Engine.stop();
    }
    if (settings.enabled && settings.dimImages) root.setAttribute('data-utadark-dim', '');
    else root.removeAttribute('data-utadark-dim');
    // 段組みはダークモードのオン/オフと独立して使える
    Lyrics.setMode(String(settings.lyricsColumns));
  }

  chrome.storage.sync.get(DEFAULTS).then((s) => {
    settings = { ...DEFAULTS, ...s };
    apply();
  }).catch(() => apply());

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    for (const [k, { newValue }] of Object.entries(changes)) {
      if (k in DEFAULTS) settings[k] = newValue === undefined ? DEFAULTS[k] : newValue;
    }
    apply();
  });

  document.addEventListener('DOMContentLoaded', () => {
    Engine.refresh();
    root.removeAttribute('data-utadark-pending');
  });
  window.addEventListener('load', () => Engine.refresh());
})();
