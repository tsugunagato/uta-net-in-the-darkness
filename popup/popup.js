(async function () {
  'use strict';
  const { DEFAULTS } = globalThis.UtaDarkSettings;

  // ショートカットは Chrome に実際に割り当てられているキーを表示する
  // （Mac では「⌥⇧D」のように表示され、ユーザーが変更したキーもそのまま出る）。
  // 他の拡張と重なって割り当てられなかった場合は、設定画面への導線を出す。
  showShortcuts();

  async function showShortcuts() {
    let commands = [];
    try { commands = await chrome.commands.getAll(); } catch (e) { /* 取得できない環境では空のまま */ }
    const keyOf = Object.fromEntries(commands.map((c) => [c.name, c.shortcut || '']));
    for (const el of document.querySelectorAll('.shortcut[data-command]')) {
      const key = keyOf[el.dataset.command];
      el.textContent = '';
      if (key) {
        el.textContent = key + (el.dataset.suffix || '');
      } else {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'shortcut-link';
        btn.textContent = 'キー未設定（設定する）';
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
          window.close();
        });
        el.appendChild(btn);
      }
    }
  }
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
