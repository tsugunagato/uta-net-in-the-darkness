/*
 * ダーク化エンジン。
 *
 * セレクタを手書きで追いかけるのではなく、ページが読み込んだ CSS をすべて読み、
 * 色に関わる宣言だけを「同じセレクタ・同じ優先度」でダーク版に書き換えたミラー CSS を生成して、
 * 元のスタイルシートの直後に差し込む。カスケードの順序が保たれるので、どのページ・どの部品でも
 * 元のデザインの「明暗関係」を保ったままダークになる。
 *
 * 対象:
 *   1. <style> / <link rel=stylesheet>（@media / @supports / @layer / @container / @import / @keyframes / ネストも）
 *   2. style 属性（インラインスタイル）
 *   3. 古いページの bgcolor / <font color> / <body text link vlink> / SVG の fill・stroke 属性
 *   4. CSS 変数（--x: #fff）と、それを使う var(--x)
 *
 * やらないこと（利用規約への配慮）:
 *   - ページ本文・歌詞の DOM やテキストは変更しない（読むのは CSS と色属性だけ）
 *   - 歌ネットへ追加のリクエストを送らない（別オリジンで読めない CSS は諦める）
 */
(function () {
  'use strict';
  const C = globalThis.UtaDarkColor;
  const MARK = 'data-utadark-own';      // 拡張が挿入した <style> の目印
  const INLINE_ATTR = 'data-utadark-s'; // style 属性ミラーのキー
  const LEGACY_ATTR = 'data-utadark-a'; // bgcolor 等の属性ミラーのキー

  // ---------- プロパティ → 役割 ----------
  const ROLE_BY_PROP = {
    'background-color': 'bg',
    'background-image': 'bg',
    'color': 'fg',
    'fill': 'fg',
    'stroke': 'fg',
    'stop-color': 'fg',
    'outline-color': 'fg',
    'text-decoration-color': 'fg',
    'text-emphasis-color': 'fg',
    'caret-color': 'fg',
    '-webkit-text-fill-color': 'fg',
    '-webkit-text-stroke-color': 'fg',
    'border-top-color': 'border',
    'border-right-color': 'border',
    'border-bottom-color': 'border',
    'border-left-color': 'border',
    'border-block-start-color': 'border',
    'border-block-end-color': 'border',
    'border-inline-start-color': 'border',
    'border-inline-end-color': 'border',
    'column-rule-color': 'border',
    'box-shadow': 'shadow',
    'text-shadow': 'shadow'
  };

  // var() を含むショートハンドは、ロングハンド側の値が空文字（未解決）になる。そのときに見るショートハンド。
  const SHORTHANDS = {
    'background-color': ['background'],
    'background-image': ['background'],
    'border-top-color': ['border-top', 'border-color', 'border'],
    'border-right-color': ['border-right', 'border-color', 'border'],
    'border-bottom-color': ['border-bottom', 'border-color', 'border'],
    'border-left-color': ['border-left', 'border-color', 'border'],
    'border-block-start-color': ['border-block-start', 'border-block-color', 'border-block'],
    'border-block-end-color': ['border-block-end', 'border-block-color', 'border-block'],
    'border-inline-start-color': ['border-inline-start', 'border-inline-color', 'border-inline'],
    'border-inline-end-color': ['border-inline-end', 'border-inline-color', 'border-inline'],
    'outline-color': ['outline'],
    'text-decoration-color': ['text-decoration'],
    'column-rule-color': ['column-rule']
  };

  const VAR_ROLES = ['bg', 'fg', 'border', 'shadow'];

  /**
   * CSSStyleDeclaration から、ダーク版の宣言列（文字列）を作る。
   * 変換すべきものがなければ空文字。
   */
  function darkDecls(st, forceImportant) {
    let out = '';
    const doneShorthands = new Set();
    for (let i = 0; i < st.length; i++) {
      const p = st[i];
      const imp = forceImportant || st.getPropertyPriority(p) === 'important' ? ' !important' : '';
      const v = st.getPropertyValue(p);

      if (p.startsWith('--')) {
        for (const role of VAR_ROLES) {
          const t = C.transformTriple(v, role) ?? C.transformValue(v, role);
          if (t !== null) out += `${C.roleVar(p, role)}:${t}${imp};`;
        }
        continue;
      }

      const role = ROLE_BY_PROP[p];
      if (!role) continue;

      if (v === '') {
        // ショートハンドに var() があって未解決のケース
        for (const sh of SHORTHANDS[p] || []) {
          const sv = st.getPropertyValue(sh);
          if (!sv) continue;
          if (!doneShorthands.has(sh)) {
            doneShorthands.add(sh);
            const shRole = sh.startsWith('border') || sh === 'column-rule' ? 'border'
              : sh === 'background' ? 'bg' : 'fg';
            const t = C.transformValue(sv, shRole);
            const shImp = forceImportant || st.getPropertyPriority(sh) === 'important' ? ' !important' : '';
            if (t !== null) out += `${sh}:${t}${shImp};`;
          }
          break;
        }
        continue;
      }

      const t = C.transformValue(v, role);
      if (t !== null) out += `${p}:${t}${imp};`;
    }
    return out;
  }

  // ---------- ルールの走査 ----------

  const hasColorInKeyframes = (kf) => {
    for (const k of kf.cssRules) if (darkDecls(k.style, false)) return true;
    return false;
  };

  function keyframesText(kf) {
    // @keyframes は同名の後勝ちで丸ごと置き換わるので、色以外も含めて全部書き出す
    let s = `@keyframes ${CSS.escape(kf.name)}{`;
    for (const k of kf.cssRules) {
      let body = '';
      for (let i = 0; i < k.style.length; i++) {
        const p = k.style[i];
        const v = k.style.getPropertyValue(p);
        const role = ROLE_BY_PROP[p];
        const t = role ? C.transformValue(v, role) : null;
        body += `${p}:${t ?? v};`;
      }
      s += `${k.keyText}{${body}}`;
    }
    return s + '}';
  }

  /** CSSRuleList → ミラー CSS テキスト */
  function genRules(rules, depth) {
    let out = '';
    if (depth > 20) return out;
    for (const r of rules) {
      try {
        if (r.selectorText !== undefined && r.style) {
          // スタイルルール（CSS ネストの子ルールも持ちうる）
          const decls = darkDecls(r.style, false);
          if (/url\(/i.test(r.style.getPropertyValue('background-image'))) bgSelectors.add(r.selectorText);
          const nested = r.cssRules && r.cssRules.length ? genRules(r.cssRules, depth + 1) : '';
          if (decls || nested) out += `${r.selectorText}{${decls}${nested}}`;
        } else if (r.styleSheet !== undefined && r.href !== undefined) {
          // @import
          let inner = '';
          try { inner = r.styleSheet ? genRules(r.styleSheet.cssRules, depth + 1) : ''; } catch (e) { /* 別オリジン */ }
          const mt = r.media && r.media.mediaText;
          if (inner) out += mt && mt !== 'all' ? `@media ${mt}{${inner}}` : inner;
        } else if (r.media !== undefined && r.cssRules) {
          const inner = genRules(r.cssRules, depth + 1);
          if (inner && !/^\s*print\s*$/i.test(r.media.mediaText)) out += `@media ${r.media.mediaText}{${inner}}`;
        } else if (r.containerQuery !== undefined || (r.constructor && r.constructor.name === 'CSSContainerRule')) {
          const inner = genRules(r.cssRules, depth + 1);
          const q = r.containerQuery || r.conditionText;
          if (inner) out += `@container ${r.containerName ? r.containerName + ' ' : ''}${q}{${inner}}`;
        } else if (r.conditionText !== undefined && r.cssRules) {
          const inner = genRules(r.cssRules, depth + 1);
          if (inner) out += `@supports ${r.conditionText}{${inner}}`;
        } else if (r.name !== undefined && r.cssRules && r.keyText === undefined && r.type !== 7) {
          // @layer name { ... }（無名レイヤーは同一性を再現できないのでそのまま外に出す）
          const inner = genRules(r.cssRules, depth + 1);
          if (inner) out += r.name ? `@layer ${r.name}{${inner}}` : inner;
        } else if (r.type === 7 && r.cssRules) {
          if (hasColorInKeyframes(r)) out += keyframesText(r);
        }
      } catch (e) {
        // 1つのルールの失敗で全体を止めない
      }
    }
    return out;
  }

  // ---------- スタイルシートごとのミラー管理 ----------

  /** ownerNode → { sheet, count, el } */
  const mirrors = new Map();
  let active = false;

  function makeStyle(text, kind) {
    const el = document.createElement('style');
    el.setAttribute(MARK, kind);
    el.media = 'screen';
    el.textContent = text;
    return el;
  }

  function isOwn(node) {
    return node && node.nodeType === 1 && node.hasAttribute(MARK);
  }

  function mirrorFor(sheet) {
    let rules;
    try { rules = sheet.cssRules; } catch (e) { return null; } // 別オリジンは読めない（取得し直すことはしない）
    let text = genRules(rules, 0);
    const mt = sheet.media && sheet.media.mediaText;
    if (mt && mt !== 'all') {
      if (/^\s*print\s*$/i.test(mt)) return '';
      text = `@media ${mt}{${text}}`;
    }
    return text;
  }

  function syncSheets() {
    if (!active) return;
    const seen = new Set();
    for (const sheet of Array.from(document.styleSheets)) {
      const owner = sheet.ownerNode;
      if (!owner || isOwn(owner)) continue;
      seen.add(owner);
      let count = -1;
      try { count = sheet.cssRules.length; } catch (e) { /* 別オリジン */ }
      const rec = mirrors.get(owner);
      if (rec && rec.sheet === sheet && rec.count === count) {
        if (rec.el) {
          rec.el.disabled = sheet.disabled;
          if (rec.el.previousSibling !== owner && owner.parentNode) owner.after(rec.el);
        }
        continue;
      }
      const text = mirrorFor(sheet);
      if (rec && rec.el) rec.el.remove();
      let el = null;
      if (text) {
        el = makeStyle(text, 'sheet');
        el.disabled = sheet.disabled;
        owner.after(el);
      }
      mirrors.set(owner, { sheet, count, el });
    }
    for (const [owner, rec] of mirrors) {
      if (!seen.has(owner)) {
        if (rec.el) rec.el.remove();
        mirrors.delete(owner);
      }
    }
    // 要素向けのミラーは常に最後尾に置く
    if (elementStyle && elementStyle.isConnected && elementStyle !== lastChildOfRoot()) placeElementStyle();
  }

  // ---------- style 属性・古い色属性 ----------

  let elementStyle = null;
  const ruleIds = new Map(); // ルール本文 → id
  let nextId = 1;

  function lastChildOfRoot() {
    const host = document.body || document.documentElement;
    return host.lastElementChild;
  }

  function placeElementStyle() {
    if (!elementStyle) elementStyle = makeStyle('', 'elements');
    (document.body || document.documentElement).appendChild(elementStyle);
  }

  function ruleId(body, build) {
    let id = ruleIds.get(body);
    if (!id) {
      id = (nextId++).toString(36);
      ruleIds.set(body, id);
      if (!elementStyle || !elementStyle.isConnected) placeElementStyle();
      elementStyle.appendChild(document.createTextNode(build(id)));
    }
    return id;
  }

  function setKey(el, attr, id) {
    if (id) { if (el.getAttribute(attr) !== id) el.setAttribute(attr, id); }
    else if (el.hasAttribute(attr)) el.removeAttribute(attr);
  }

  function processInline(el) {
    const decls = el.style && el.style.length ? darkDecls(el.style, true) : '';
    const id = decls ? ruleId('s|' + decls, (k) => `[${INLINE_ATTR}="${k}"]{${decls}}`) : null;
    setKey(el, INLINE_ATTR, id);
  }

  function legacyColor(v) {
    if (!v) return null;
    v = v.trim();
    if (/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) v = '#' + v; // bgcolor="ffffff" 形式
    return C.parseColor(v) ? v : null;
  }

  function processLegacy(el) {
    let decls = '';
    let links = '';
    const add = (attr, prop, role) => {
      const c = legacyColor(el.getAttribute(attr));
      if (!c) return;
      const t = C.transformColor(c, role);
      if (t) decls += `${prop}:${t};`;
    };
    add('bgcolor', 'background-color', 'bg');
    add('bordercolor', 'border-color', 'border');
    if (el.namespaceURI === 'http://www.w3.org/2000/svg') {
      add('fill', 'fill', 'fg');
      add('stroke', 'stroke', 'fg');
      add('stop-color', 'stop-color', 'fg');
    } else if (el.localName === 'font' || el.localName === 'basefont') {
      add('color', 'color', 'fg');
    } else if (el.localName === 'body') {
      add('text', 'color', 'fg');
      for (const [attr, pseudo] of [['link', ':link'], ['vlink', ':visited'], ['alink', ':active']]) {
        const c = legacyColor(el.getAttribute(attr));
        const t = c && C.transformColor(c, 'fg');
        if (t) links += `${pseudo}{color:${t}}`;
      }
    }
    if (!decls && !links) { setKey(el, LEGACY_ATTR, null); return; }
    // 属性由来の色は CSS より弱いので、詳細度 0 の :where() で出す
    const id = ruleId('a|' + decls + links, (k) => {
      const sel = `:where([${LEGACY_ATTR}="${k}"])`;
      let s = decls ? `${sel}{${decls}}` : '';
      if (links) s += links.replace(/(:link|:visited|:active)\{/g, `${sel} a$1{`);
      return s;
    });
    setKey(el, LEGACY_ATTR, id);
  }

  const LEGACY_SEL = '[bgcolor],[bordercolor],font[color],basefont[color],body[text],body[link],body[vlink],body[alink],' +
    'svg[fill],svg [fill],svg[stroke],svg [stroke],svg [stop-color]';
  const WATCH_ATTRS = ['style', 'bgcolor', 'bordercolor', 'color', 'text', 'link', 'vlink', 'alink', 'fill', 'stroke', 'stop-color'];

  function processElement(el) {
    if (el.nodeType !== 1 || isOwn(el)) return;
    if (el.hasAttribute('style') || el.hasAttribute(INLINE_ATTR)) processInline(el);
    if (el.matches(LEGACY_SEL) || el.hasAttribute(LEGACY_ATTR)) processLegacy(el);
  }

  function processTree(root) {
    if (root.nodeType !== 1) return;
    processElement(root);
    for (const el of root.querySelectorAll('[style],' + LEGACY_SEL)) processElement(el);
  }

  // ---------- 背景画像の上に文字がある要素 ----------
  // 旧ページでは水玉柄や白い枠を背景画像で描き、その上に文字を載せていることが多い。
  // 文字だけ明るくすると読めなくなるので、そうした要素には印を付け、
  // content.css 側で background-blend-mode: multiply により背景画像を暗く沈める。
  // （小さいアイコン等は対象外にするため、文字を含み・一定以上の面積があるものに限る）

  const BACKDROP_ATTR = 'data-utadark-backdrop';
  const BACKDROP_MIN_AREA = 20000; // px²（ヘッダーのアイコン付きリンク 120×60 などは除外される）
  const bgSelectors = new Set(['[background]', '[style*="url("]']);
  let backdropTimer = null;

  function scanBackdrops() {
    if (!active || !document.body) return;
    const marked = new Set();
    for (const sel of bgSelectors) {
      let els;
      try { els = document.querySelectorAll(sel); } catch (e) { bgSelectors.delete(sel); continue; }
      for (const el of els) {
        if (marked.has(el) || isOwn(el) || !el.textContent.trim()) continue;
        const r = el.getBoundingClientRect();
        if (r.width * r.height < BACKDROP_MIN_AREA) continue;
        const cs = getComputedStyle(el);
        if (!cs.backgroundImage.includes('url(')) continue;
        marked.add(el);
        if (!el.hasAttribute(BACKDROP_ATTR)) {
          // 背景色がない（透明）なら灰色を敷いてから乗算、あれば（ダーク化済みの）背景色と乗算
          const transparent = cs.backgroundColor === 'transparent' || /,\s*0\)$/.test(cs.backgroundColor);
          el.setAttribute(BACKDROP_ATTR, transparent ? 'fill' : 'blend');
        }
      }
    }
    for (const el of document.querySelectorAll(`[${BACKDROP_ATTR}]`)) {
      if (!marked.has(el)) el.removeAttribute(BACKDROP_ATTR);
    }
  }

  function scheduleBackdrops() {
    clearTimeout(backdropTimer);
    backdropTimer = setTimeout(scanBackdrops, 400);
  }

  // ---------- 監視 ----------

  let observer = null;

  function onMutations(records) {
    let sheetsDirty = false;
    for (const r of records) {
      if (r.type === 'childList') {
        if (isOwn(r.target)) continue;
        const t = r.target;
        if (t.localName === 'style') sheetsDirty = true; // textContent の差し替え
        for (const n of r.addedNodes) {
          if (n.nodeType !== 1 || isOwn(n)) continue;
          if (n.localName === 'style' || n.localName === 'link') sheetsDirty = true;
          processTree(n);
          if (!sheetsDirty && n.querySelector && n.querySelector('style,link[rel~="stylesheet"]')) sheetsDirty = true;
        }
        for (const n of r.removedNodes) {
          if (n.nodeType === 1 && !isOwn(n) && (n.localName === 'style' || n.localName === 'link' ||
              (n.querySelector && n.querySelector('style,link')))) sheetsDirty = true;
        }
      } else if (r.type === 'attributes') {
        const t = r.target;
        if (isOwn(t)) continue;
        if (t.localName === 'link' || t.localName === 'style') sheetsDirty = true;
        else processElement(t);
      }
    }
    // 読み込み中は <style> の中身がいつ確定したか分かりにくいので毎回確認する（未変更のシートは即スキップされる）
    if (sheetsDirty || document.readyState === 'loading') syncSheets();
    if (document.readyState !== 'loading') scheduleBackdrops();
  }

  function onLoadCapture(e) {
    const t = e.target;
    if (t && (t.localName === 'link' || t.localName === 'style')) syncSheets();
  }

  // CSSOM 経由（insertRule 等）の変更は MutationObserver に出ないので、ときどき確認する
  let pollTimer = null;

  function start() {
    if (active) return;
    active = true;
    syncSheets();
    processTree(document.documentElement);
    observer = new MutationObserver(onMutations);
    observer.observe(document, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: WATCH_ATTRS.concat(['media', 'disabled', 'href', 'rel'])
    });
    document.addEventListener('load', onLoadCapture, true);
    pollTimer = setInterval(() => { if (!document.hidden) syncSheets(); }, 2000);
  }

  function stop() {
    if (!active) return;
    active = false;
    if (observer) observer.disconnect();
    observer = null;
    document.removeEventListener('load', onLoadCapture, true);
    clearInterval(pollTimer);
    clearTimeout(backdropTimer);
    for (const el of document.querySelectorAll(`[${BACKDROP_ATTR}]`)) el.removeAttribute(BACKDROP_ATTR);
    for (const rec of mirrors.values()) if (rec.el) rec.el.remove();
    mirrors.clear();
    if (elementStyle) elementStyle.remove();
    elementStyle = null;
    ruleIds.clear();
    for (const el of document.querySelectorAll(`[${INLINE_ATTR}],[${LEGACY_ATTR}]`)) {
      el.removeAttribute(INLINE_ATTR);
      el.removeAttribute(LEGACY_ATTR);
    }
  }

  /** 読み込み完了時などに呼ぶ全体の再同期 */
  function refresh() {
    if (!active) return;
    syncSheets();
    processTree(document.documentElement);
    scanBackdrops();
  }

  globalThis.UtaDarkEngine = { start, stop, refresh, darkDecls, genRules };
})();
