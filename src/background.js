/* キーボードショートカットの処理。設定を書き換えるだけで、ページへの通信は行わない。 */
if (typeof importScripts === 'function' && !globalThis.UtaDarkSettings) importScripts('settings.js');

const { DEFAULTS, COLUMN_MODES } = globalThis.UtaDarkSettings;

chrome.commands.onCommand.addListener(async (command) => {
  const s = await chrome.storage.sync.get(DEFAULTS);
  if (command === 'toggle-dark') {
    await chrome.storage.sync.set({ enabled: !s.enabled });
  } else if (command === 'cycle-columns') {
    const i = COLUMN_MODES.indexOf(String(s.lyricsColumns));
    await chrome.storage.sync.set({ lyricsColumns: COLUMN_MODES[(i + 1) % COLUMN_MODES.length] });
  }
});
