// 拡張機能のアイコンを描いて icons/{16,32,48,128}.png に書き出す。
// macOS の JavaScript for Automation（AppKit）で動く。外部ツール不要。
//   osascript -l JavaScript scripts/make-icons.js <出力先ディレクトリ>
//
// デザイン: 暗い角丸の地に、月明かりの色の八分音符を1つ。
// 符頭は傾けた楕円、符尾と旗はひと続きの輪郭で描き、符尾は符頭の右端にちょうど接する位置に置く。
// 余白・縁線・グローの扱いはサイズで変える（draw() の説明を参照）。

ObjC.import('AppKit');

const BG = [0x22, 0x23, 0x2e];
const RIM = [0x4a, 0x4c, 0x60];
const NOTE = [0xf5, 0xd9, 0x7a];

function color(rgb) {
  return $.NSColor.colorWithSRGBRedGreenBlueAlpha(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, 1);
}
const P = (x, y) => $.NSMakePoint(x, y);

/*
 * 八分音符（128×128 の座標、原点は左下）。
 * 符頭は横長の楕円を右上がりに傾けたもの。符尾は符頭の右端にちょうど接するよう、
 * 傾けた楕円の「最も右の点」を計算してそこに右辺を合わせる。
 */
function notePath() {
  const cx = 52, cy = 36;          // 符頭の中心
  const rx = 18, ry = 13;          // 符頭の半径
  const tilt = 24 * Math.PI / 180; // 右上がりの傾き
  const stemW = 7.5;
  const stemTop = 106;

  // 傾けた楕円の最も右の点（x 最大）
  const c = Math.cos(tilt), s = Math.sin(tilt);
  const k = Math.sqrt(rx * rx * c * c + ry * ry * s * s);
  const right = cx + k;
  const rightY = cy + (rx * rx - ry * ry) * s * c / k;

  // 符頭と「符尾＋旗」は別々のパスにし、それぞれ塗る（重なり部分が穴にならないように）
  // 符頭
  const head = $.NSBezierPath.bezierPathWithOvalInRect($.NSMakeRect(-rx, -ry, rx * 2, ry * 2));
  const t = $.NSAffineTransform.transform;
  t.translateXByYBy(cx, cy);
  t.rotateByDegrees(24);
  head.transformUsingAffineTransform(t);

  // 符尾＋旗をひと続きの輪郭で描く（左下 → 左上 → 旗の外側 → 旗の先 → 旗の内側 → 符尾の右辺 → 右下）
  const x0 = right - stemW, x1 = right;
  const body = $.NSBezierPath.bezierPath;
  body.moveToPoint(P(x0, rightY - 4));
  body.lineToPoint(P(x0, stemTop));
  body.lineToPoint(P(x1, stemTop));
  // 旗の外側：上端から右へふくらみ、下へ流れる
  body.curveToPointControlPoint1ControlPoint2(P(x1 + 22, 66), P(x1 + 2, 90), P(x1 + 26, 84));
  // 旗の先端を丸める
  body.curveToPointControlPoint1ControlPoint2(P(x1 + 16, 60), P(x1 + 22, 62), P(x1 + 19, 60));
  // 旗の内側：先端から符尾へ戻る
  body.curveToPointControlPoint1ControlPoint2(P(x1, 82), P(x1 + 16, 72), P(x1 + 6, 80));
  body.lineToPoint(P(x1, rightY));
  body.closePath;

  // 全体を中央に寄せる
  const all = $.NSBezierPath.bezierPath;
  all.appendBezierPath(head);
  all.appendBezierPath(body);
  const b = all.bounds;
  const m = $.NSAffineTransform.transform;
  m.translateXByYBy(64 - (b.origin.x + b.size.width / 2), 64 - (b.origin.y + b.size.height / 2));
  head.transformUsingAffineTransform(m);
  body.transformUsingAffineTransform(m);
  return [head, body];
}

/*
 * Chrome ウェブストアの画像ガイドライン（developer.chrome.com/docs/webstore/images#icons）に合わせ、
 * 48px と 128px は「図柄 96×96 ＋ 周囲 16px の透明な余白」（幅の 75%）にし、
 * 縁線は付けず、暗いアイコン向けに薄い白の外側グローを付ける。
 * ツールバー用の 16px / 32px は余白を取ると小さくなりすぎるので、ほぼ全面に描き、
 * 暗いツールバーでも輪郭が分かるよう明るめの縁線を残す。
 */
function draw(size) {
  const padded = size >= 48;

  if (padded) {
    // 116×116 で描く図柄を 96×96 に縮めて中央へ
    const t = $.NSAffineTransform.transform;
    t.translateXByYBy(64, 64);
    t.scaleBy(96 / 116);
    t.translateXByYBy(-64, -64);
    t.concat;
  }

  const bg = $.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius($.NSMakeRect(6, 6, 116, 116), 28, 28);
  $.NSGraphicsContext.saveGraphicsState;
  if (padded) {
    const glow = $.NSShadow.alloc.init;
    glow.shadowColor = $.NSColor.colorWithSRGBRedGreenBlueAlpha(1, 1, 1, 0.35);
    glow.shadowBlurRadius = 4 * size / 128;
    glow.shadowOffset = $.NSMakeSize(0, 0);
    glow.set;
  }
  color(BG).setFill;
  bg.fill;
  $.NSGraphicsContext.restoreGraphicsState;

  if (!padded) {
    const rim = $.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius($.NSMakeRect(7.5, 7.5, 113, 113), 26.5, 26.5);
    rim.lineWidth = size <= 16 ? 6 : 3;
    color(RIM).setStroke;
    rim.stroke;
  }

  color(NOTE).setFill;
  for (const part of notePath()) part.fill;
}

function render(size, path) {
  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, size, size, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  const ctx = $.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext(ctx);
  ctx.shouldAntialias = true;
  const t = $.NSAffineTransform.transform;
  t.scaleBy(size / 128);
  t.concat;
  draw(size);
  $.NSGraphicsContext.restoreGraphicsState;
  const data = rep.representationUsingTypeProperties(4 /* NSBitmapImageFileTypePNG */, $({}));
  if (!data.writeToFileAtomically(path, true)) throw new Error('write failed: ' + path);
}

function run(argv) {
  const dir = argv[0] || 'icons';
  const sizes = argv[1] ? argv[1].split(',').map(Number) : [16, 32, 48, 128];
  for (const size of sizes) render(size, `${dir}/${size}.png`);
  return 'wrote ' + dir;
}
