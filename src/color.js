/*
 * 色の解析と「ダーク化」変換。
 * DOM に依存しない純粋関数だけを置き、テスト（test/color.test.js）から直接呼べるようにしている。
 *
 * 役割（role）ごとに変換のしかたを変える:
 *   bg     … 背景。明るい色は暗く、もともと暗い色はさらに少し暗く。
 *   fg     … 文字・アイコン。暗い色は明るく、明るい色はほぼそのまま。
 *   border … 罫線。背景より少しだけ浮く明るさに寄せる。
 *   shadow … 影。明るい影（白いグロー等）は黒に、暗い影はそのまま。
 */
(function (root) {
  'use strict';

  const NAMED = {
    aliceblue: 'f0f8ff', antiquewhite: 'faebd7', aqua: '00ffff', aquamarine: '7fffd4', azure: 'f0ffff',
    beige: 'f5f5dc', bisque: 'ffe4c4', black: '000000', blanchedalmond: 'ffebcd', blue: '0000ff',
    blueviolet: '8a2be2', brown: 'a52a2a', burlywood: 'deb887', cadetblue: '5f9ea0', chartreuse: '7fff00',
    chocolate: 'd2691e', coral: 'ff7f50', cornflowerblue: '6495ed', cornsilk: 'fff8dc', crimson: 'dc143c',
    cyan: '00ffff', darkblue: '00008b', darkcyan: '008b8b', darkgoldenrod: 'b8860b', darkgray: 'a9a9a9',
    darkgreen: '006400', darkgrey: 'a9a9a9', darkkhaki: 'bdb76b', darkmagenta: '8b008b', darkolivegreen: '556b2f',
    darkorange: 'ff8c00', darkorchid: '9932cc', darkred: '8b0000', darksalmon: 'e9967a', darkseagreen: '8fbc8f',
    darkslateblue: '483d8b', darkslategray: '2f4f4f', darkslategrey: '2f4f4f', darkturquoise: '00ced1',
    darkviolet: '9400d3', deeppink: 'ff1493', deepskyblue: '00bfff', dimgray: '696969', dimgrey: '696969',
    dodgerblue: '1e90ff', firebrick: 'b22222', floralwhite: 'fffaf0', forestgreen: '228b22', fuchsia: 'ff00ff',
    gainsboro: 'dcdcdc', ghostwhite: 'f8f8ff', gold: 'ffd700', goldenrod: 'daa520', gray: '808080',
    green: '008000', greenyellow: 'adff2f', grey: '808080', honeydew: 'f0fff0', hotpink: 'ff69b4',
    indianred: 'cd5c5c', indigo: '4b0082', ivory: 'fffff0', khaki: 'f0e68c', lavender: 'e6e6fa',
    lavenderblush: 'fff0f5', lawngreen: '7cfc00', lemonchiffon: 'fffacd', lightblue: 'add8e6', lightcoral: 'f08080',
    lightcyan: 'e0ffff', lightgoldenrodyellow: 'fafad2', lightgray: 'd3d3d3', lightgreen: '90ee90', lightgrey: 'd3d3d3',
    lightpink: 'ffb6c1', lightsalmon: 'ffa07a', lightseagreen: '20b2aa', lightskyblue: '87cefa',
    lightslategray: '778899', lightslategrey: '778899', lightsteelblue: 'b0c4de', lightyellow: 'ffffe0',
    lime: '00ff00', limegreen: '32cd32', linen: 'faf0e6', magenta: 'ff00ff', maroon: '800000',
    mediumaquamarine: '66cdaa', mediumblue: '0000cd', mediumorchid: 'ba55d3', mediumpurple: '9370db',
    mediumseagreen: '3cb371', mediumslateblue: '7b68ee', mediumspringgreen: '00fa9a', mediumturquoise: '48d1cc',
    mediumvioletred: 'c71585', midnightblue: '191970', mintcream: 'f5fffa', mistyrose: 'ffe4e1', moccasin: 'ffe4b5',
    navajowhite: 'ffdead', navy: '000080', oldlace: 'fdf5e6', olive: '808000', olivedrab: '6b8e23', orange: 'ffa500',
    orangered: 'ff4500', orchid: 'da70d6', palegoldenrod: 'eee8aa', palegreen: '98fb98', paleturquoise: 'afeeee',
    palevioletred: 'db7093', papayawhip: 'ffefd5', peachpuff: 'ffdab9', peru: 'cd853f', pink: 'ffc0cb',
    plum: 'dda0dd', powderblue: 'b0e0e6', purple: '800080', rebeccapurple: '663399', red: 'ff0000',
    rosybrown: 'bc8f8f', royalblue: '4169e1', saddlebrown: '8b4513', salmon: 'fa8072', sandybrown: 'f4a460',
    seagreen: '2e8b57', seashell: 'fff5ee', sienna: 'a0522d', silver: 'c0c0c0', skyblue: '87ceeb',
    slateblue: '6a5acd', slategray: '708090', slategrey: '708090', snow: 'fffafa', springgreen: '00ff7f',
    steelblue: '4682b4', tan: 'd2b48c', teal: '008080', thistle: 'd8bfd8', tomato: 'ff6347', turquoise: '40e0d0',
    violet: 'ee82ee', wheat: 'f5deb3', white: 'ffffff', whitesmoke: 'f5f5f5', yellow: 'ffff00', yellowgreen: '9acd32'
  };

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // ---------- 解析 ----------

  function parseHex(h) {
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    if (h.length === 6) return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
    return {
      r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16), a: parseInt(h.slice(6, 8), 16) / 255
    };
  }

  function num(s, scale) {
    s = s.trim();
    if (s === 'none') return 0;
    if (s.endsWith('%')) return (parseFloat(s) / 100) * scale;
    return parseFloat(s);
  }

  function splitArgs(inner) {
    // "255, 0, 0, .5" / "255 0 0 / 50%" の両方に対応
    let alpha = null;
    const slash = inner.split('/');
    if (slash.length === 2) { alpha = slash[1]; inner = slash[0]; }
    const parts = inner.split(/[\s,]+/).filter(Boolean);
    if (alpha === null && parts.length === 4) alpha = parts.pop();
    return { parts, alpha };
  }

  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return { r: f(h + 1 / 3) * 255, g: f(h) * 255, b: f(h - 1 / 3) * 255 };
  }

  function rgbToHsl({ r, g, b }) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { h: h * 60, s, l };
  }

  /** 1つの色トークンを {r,g,b,a} に。解析できなければ null。 */
  function parseColor(str) {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    if (s[0] === '#') return parseHex(s.slice(1));
    if (NAMED[s]) return parseHex(NAMED[s]);
    const m = s.match(/^(rgba?|hsla?)\((.*)\)$/);
    if (!m) return null;
    const { parts, alpha } = splitArgs(m[2]);
    if (parts.length !== 3) return null;
    let a = alpha === null ? 1 : num(alpha, 1);
    if (Number.isNaN(a)) return null;
    let rgb;
    if (m[1].startsWith('rgb')) {
      rgb = { r: num(parts[0], 255), g: num(parts[1], 255), b: num(parts[2], 255) };
    } else {
      const h = parseFloat(parts[0]); // deg 前提（turn 等は歌ネットでは使われていない）
      rgb = hslToRgb(h, num(parts[1], 1), num(parts[2], 1));
    }
    if ([rgb.r, rgb.g, rgb.b].some(Number.isNaN)) return null;
    return { r: clamp(rgb.r, 0, 255), g: clamp(rgb.g, 0, 255), b: clamp(rgb.b, 0, 255), a: clamp(a, 0, 1) };
  }

  function formatColor({ r, g, b, a }) {
    r = Math.round(r); g = Math.round(g); b = Math.round(b);
    if (a >= 1) return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;
  }

  // ---------- 明るさ ----------

  function luminance({ r, g, b }) {
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  /** HSL の L を動かして相対輝度の上限/下限に収める（色相・彩度は保つ）。 */
  function fitLuminance(hsl, test, step) {
    let { h, s, l } = hsl;
    for (let i = 0; i < 60 && !test(luminance(hslToRgb(h, s, l))); i++) {
      l = clamp(l + step, 0, 1);
      if (l === 0 || l === 1) break;
    }
    return { h, s, l };
  }

  // ---------- 役割ごとの変換 ----------
  // 定数は「白背景 → #171717 前後」「黒文字 → #e0e0e0 前後」になるよう調整してある。

  const BG_FLOOR = 0.04;      // 黒背景の行き先
  const BG_WHITE = 0.09;      // 白背景の行き先
  const BG_PEAK = 0.34;       // 中間色(L=0.5)の行き先
  const BG_MAX_LUM = 0.075;   // 背景として許す最大輝度（明るい文字との対比を保つ）
  const FG_BLACK = 0.88;      // 黒文字の行き先
  const FG_MIN_LUM = 0.26;    // 文字として許す最小輝度（#171717 背景に対し約 5:1）

  function bgHsl({ h, s, l }) {
    if (l > 0.5) {
      l = BG_PEAK - (l - 0.5) * 2 * (BG_PEAK - BG_WHITE);
      s *= 0.8;
    } else {
      l = BG_FLOOR + l * 2 * (BG_PEAK - BG_FLOOR);
    }
    return fitLuminance({ h, s, l }, (y) => y <= BG_MAX_LUM, -0.01);
  }

  function fgHsl({ h, s, l }) {
    if (l < 0.5) l = FG_BLACK - l * 0.56;
    else l = Math.max(0.55, l * 0.95);
    return fitLuminance({ h, s, l }, (y) => y >= FG_MIN_LUM, 0.01);
  }

  function borderHsl({ h, s, l }) {
    if (l >= 0.5) { l = 0.2 + (1 - l) * 0.3; s *= 0.8; }
    else l = 0.3 + l * 0.5;
    return { h, s, l };
  }

  function shadowHsl({ h, s, l }) {
    return l > 0.5 ? { h, s, l: 0 } : { h, s, l };
  }

  const ROLE = { bg: bgHsl, fg: fgHsl, border: borderHsl, shadow: shadowHsl };

  const cache = new Map();

  /** 色1つを変換。解析できなければ null。 */
  function transformColor(str, role) {
    const key = role + '|' + str;
    if (cache.has(key)) return cache.get(key);
    const c = parseColor(str);
    let out = null;
    if (c) {
      const hsl0 = rgbToHsl(c);
      if (c.a === 0) out = formatColor(c);
      else if (c.a < 1 && hsl0.l < 0.5 && (role === 'border' || (role === 'bg' && c.a < 0.3))) {
        // 半透明の黒（Bootstrap の rgba(0,0,0,.125) の罫線や、ホバー時のうっすら暗くする背景）は
        // 暗い背景の上では見えなくなるので、明暗を反転して「うっすら明るくする」に置き換える
        const rgb = hslToRgb(hsl0.h, hsl0.s * 0.5, 1 - hsl0.l);
        out = formatColor({ ...rgb, a: c.a });
      } else {
        const hsl = ROLE[role](hsl0);
        out = formatColor({ ...hslToRgb(hsl.h, hsl.s, hsl.l), a: c.a });
      }
    }
    if (cache.size > 5000) cache.clear();
    cache.set(key, out);
    return out;
  }

  // 値の中に出てくる色トークン（#hex / rgb() / hsl() / 色名）を拾う正規表現。
  // url(...) と var(...) の中身は別途保護してから使う。
  const NAMED_RE = Object.keys(NAMED).sort((a, b) => b.length - a.length).join('|');
  // 色名は「--bs-white」のような識別子の一部には当てないよう、前後がハイフン・英数字でないことを条件にする。
  const TOKEN_RE = new RegExp(
    '#[0-9a-fA-F]{3,8}(?![0-9a-zA-Z_-])|(?:rgba?|hsla?)\\([^()]*\\)|(?<![\\w-])(?:' + NAMED_RE + ')(?![\\w-])', 'gi');

  /**
   * 宣言値の文字列に含まれる色をすべて変換する。
   * 例: "linear-gradient(#fff, rgba(0,0,0,.5))" や "0 1px 2px #ccc"
   * var(--x) は var(--utadark-ROLE--x, var(--x)) に置き換える（変数側は engine が定義する）。
   * 変化がなければ null を返す（＝ミラーを出す必要がない）。
   */
  function transformValue(value, role) {
    if (!value) return null;
    // url() の中身は触らない
    const urls = [];
    let v = value.replace(/url\((?:[^()'"]|"[^"]*"|'[^']*')*\)/gi, (m) => { urls.push(m); return `\u0000${urls.length - 1}\u0000`; });
    let changed = false;
    v = v.replace(TOKEN_RE, (tok) => {
      const t = transformColor(tok, role);
      if (t === null) return tok;
      changed = true;
      return t;
    });
    if (v.includes('var(')) {
      const rv = rewriteVars(v, role);
      if (rv !== v) { v = rv; changed = true; }
    }
    if (!changed) return null;
    return v.replace(/\u0000(\d+)\u0000/g, (_, i) => urls[+i]);
  }

  /** var(--x[, fallback]) → var(--utadark-ROLE--x, var(--x[, fallback]))。入れ子も括弧を数えて処理する。 */
  function rewriteVars(v, role) {
    let out = '';
    let i = 0;
    while (i < v.length) {
      const k = v.indexOf('var(', i);
      if (k < 0) { out += v.slice(i); break; }
      out += v.slice(i, k);
      // 対応する閉じ括弧を探す
      let depth = 0, j = k + 3;
      for (; j < v.length; j++) {
        if (v[j] === '(') depth++;
        else if (v[j] === ')' && --depth === 0) break;
      }
      if (j >= v.length) { out += v.slice(k); break; }
      const inner = v.slice(k + 4, j);
      const comma = inner.indexOf(',');
      const name = (comma < 0 ? inner : inner.slice(0, comma)).trim();
      const rest = comma < 0 ? '' : ',' + rewriteVars(inner.slice(comma + 1), role);
      if (name.startsWith('--utadark-') || !name.startsWith('--')) out += `var(${name}${rest})`;
      else out += `var(${roleVar(name, role)}, var(${name}${rest}))`;
      i = j + 1;
    }
    return out;
  }

  function roleVar(name, role) {
    return `--utadark-${role}${name}`; // --bs-white → --utadark-bg--bs-white
  }

  /** "13, 110, 253" のような RGB 三つ組（Bootstrap の --*-rgb 変数）を変換 */
  function transformTriple(value, role) {
    const m = value.trim().match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
    if (!m) return null;
    const t = transformColor(`rgb(${m[1]}, ${m[2]}, ${m[3]})`, role);
    const c = parseColor(t);
    return `${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}`;
  }

  const api = {
    parseColor, formatColor, luminance, rgbToHsl, hslToRgb,
    transformColor, transformValue, transformTriple, roleVar
  };
  root.UtaDarkColor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
