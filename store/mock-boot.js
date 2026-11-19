// 見本ページの起動。?dark でエンジンを動かし、?cols=2 などで段組みを指定、?scroll=<id> でその位置へ。
(function () {
  const q = new URLSearchParams(location.search);
  if (q.has('dark')) {
    document.documentElement.setAttribute('data-utadark', 'on');
    UtaDarkEngine.start();
  }
  UtaDarkLyrics.setMode(q.get('cols') || 'off');
  window.addEventListener('load', () => {
    const id = q.get('scroll');
    const el = id && document.getElementById(id);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 12);
  });
})();
