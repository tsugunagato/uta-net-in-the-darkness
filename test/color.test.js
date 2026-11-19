/*
 * src/color.js のテスト。ランタイム非依存（Node / ブラウザ / macOS の osascript で動く）。
 *   ./scripts/test.sh
 */
(function () {
  const C = (typeof UtaDarkColor !== 'undefined') ? UtaDarkColor : require('../src/color.js');
  const results = [];
  let failed = 0;
  function ok(cond, name, detail) {
    if (!cond) failed++;
    results.push((cond ? 'ok   ' : 'FAIL ') + name + (cond || detail === undefined ? '' : '  → ' + detail));
  }
  const lum = (s) => C.luminance(C.parseColor(s));
  const contrast = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  // --- parse ---
  ok(JSON.stringify(C.parseColor('#fff')) === '{"r":255,"g":255,"b":255,"a":1}', 'parse #fff');
  ok(C.parseColor('#11223380').a > 0.49 && C.parseColor('#11223380').a < 0.51, 'parse #rrggbbaa');
  ok(C.parseColor('rgb(10, 20, 30)').g === 20, 'parse rgb()');
  ok(C.parseColor('rgba(0,0,0,.5)').a === 0.5, 'parse rgba() legacy');
  ok(C.parseColor('rgb(0 0 0 / 25%)').a === 0.25, 'parse rgb() modern');
  ok(Math.round(C.parseColor('hsl(0, 100%, 50%)').r) === 255, 'parse hsl()');
  ok(C.parseColor('Navy').b === 128, 'parse named (case-insensitive)');
  ok(C.parseColor('currentcolor') === null && C.parseColor('inherit') === null, 'keywords are not colors');

  // --- roles ---
  const white = C.transformColor('#ffffff', 'bg');
  ok(lum(white) < 0.02, 'white bg becomes dark', white);
  ok(lum(C.transformColor('#f5f5f5', 'bg')) > lum(white), 'light-gray bg is slightly lighter than white bg (elevation kept)');
  ok(lum(C.transformColor('#000', 'bg')) < lum(white), 'black bg stays darker than white bg');
  ok(lum(C.transformColor('#ffd800', 'bg')) <= 0.0751, 'bright yellow bg is capped dark', C.transformColor('#ffd800', 'bg'));

  const black = C.transformColor('#000', 'fg');
  ok(contrast(black, white) > 10, 'black text on white → readable on dark', contrast(black, white).toFixed(2));
  ok(C.transformColor('#fff', 'fg') !== null && lum(C.transformColor('#fff', 'fg')) > 0.8, 'white text stays light');
  for (const c of ['#0000ff', '#1d2088', '#c00', '#800080', '#006400', '#333', '#666', '#999']) {
    const t = C.transformColor(c, 'fg');
    ok(contrast(t, white) >= 4.5, `fg ${c} → ${t} has ≥4.5:1 on dark bg`, contrast(t, white).toFixed(2));
  }
  const hueBefore = C.rgbToHsl(C.parseColor('#c00')).h;
  const hueAfter = C.rgbToHsl(C.parseColor(C.transformColor('#c00', 'fg'))).h;
  ok(Math.abs(hueBefore - hueAfter) < 3, 'fg keeps hue (red stays red)', hueAfter);

  const bd = C.transformColor('#ddd', 'border');
  ok(lum(bd) > lum(white) && lum(bd) < 0.1, 'light border becomes subtle on dark', bd);
  ok(C.transformColor('rgba(255,255,255,.8)', 'shadow') === 'rgba(0, 0, 0, 0.8)', 'white glow shadow → black, alpha kept');
  ok(C.transformColor('rgba(255,255,255,0.5)', 'bg').startsWith('rgba('), 'alpha preserved for bg');
  ok(C.transformColor('transparent', 'bg') === null, 'transparent untouched');
  ok(C.transformColor('rgba(0,0,0,.125)', 'border') === 'rgba(255, 255, 255, 0.125)', 'translucent black border → translucent white',
    C.transformColor('rgba(0,0,0,.125)', 'border'));
  ok(C.transformColor('rgba(0,0,0,.05)', 'bg') === 'rgba(255, 255, 255, 0.05)', 'subtle dark overlay bg → subtle light overlay');
  ok(lum(C.transformColor('rgba(0,0,0,.5)', 'bg').replace(/, 0\.5\)$/, ')').replace('rgba', 'rgb')) < 0.01, 'modal backdrop stays black');

  // --- values ---
  ok(C.transformValue('0 1px 2px #ccc', 'shadow') === '0 1px 2px #000000', 'shadow value', C.transformValue('0 1px 2px #ccc', 'shadow'));
  const g = C.transformValue('linear-gradient(#fff, rgb(240, 240, 240))', 'bg');
  ok(g && !g.includes('#fff,') && g.startsWith('linear-gradient('), 'gradient colors converted', g);
  ok(C.transformValue('url("white.png") #fff', 'bg').startsWith('url("white.png") #'), 'url() contents untouched');
  ok(C.transformValue('none', 'bg') === null, 'no color → null');
  ok(C.transformValue('var(--bs-white)', 'bg') === 'var(--utadark-bg--bs-white, var(--bs-white))', 'var rewrite, identifier not treated as color name',
    C.transformValue('var(--bs-white)', 'bg'));
  ok(C.transformValue('var(--a, #000)', 'fg') === `var(--utadark-fg--a, var(--a, ${C.transformColor('#000', 'fg')}))`, 'var with fallback',
    C.transformValue('var(--a, #000)', 'fg'));
  ok(C.transformValue('rgba(var(--x-rgb), .5)', 'bg') === 'rgba(var(--utadark-bg--x-rgb, var(--x-rgb)), .5)', 'var inside rgba()',
    C.transformValue('rgba(var(--x-rgb), .5)', 'bg'));
  ok(C.transformTriple('255, 255, 255', 'bg') !== null && C.transformTriple('255, 255, 255', 'bg') !== '255, 255, 255', 'rgb triple');
  ok(C.transformTriple('1rem', 'bg') === null, 'non-triple ignored');

  const summary = `${results.length - failed}/${results.length} passed`;
  const text = results.join('\n') + '\n' + summary;
  if (typeof module !== 'undefined' && require.main === module) {
    console.log(text);
    if (failed) process.exit(1);
  }
  if (typeof globalThis !== 'undefined') globalThis.__testOutput = { text, failed };
})();
