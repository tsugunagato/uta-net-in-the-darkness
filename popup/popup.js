(async function () {
  'use strict';
  const { DEFAULTS } = globalThis.UtaDarkSettings;
  const s = { ...DEFAULTS, ...(await chrome.storage.sync.get(DEFAULTS)) };

  for (const key of ['enabled', 'dimImages']) {
    const el = document.getElementById(key);
    el.checked = !!s[key];
    el.addEventListener('change', () => chrome.storage.sync.set({ [key]: el.checked }));
  }

  const radios = document.querySelectorAll('input[name="lyricsColumns"]');
  for (const r of radios) {
    r.checked = r.value === String(s.lyricsColumns);
    r.addEventListener('change', () => { if (r.checked) chrome.storage.sync.set({ lyricsColumns: r.value }); });
  }

  // ショートカットで変わったときも表示を合わせる
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (changes.enabled) document.getElementById('enabled').checked = !!changes.enabled.newValue;
    if (changes.dimImages) document.getElementById('dimImages').checked = !!changes.dimImages.newValue;
    if (changes.lyricsColumns) for (const r of radios) r.checked = r.value === String(changes.lyricsColumns.newValue);
  });
})();
