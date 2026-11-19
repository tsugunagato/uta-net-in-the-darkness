// 拡張機能のアイコンを描いて icons/{16,32,48,128}.png に書き出す。
// macOS の JavaScript for Automation（AppKit）で動く。外部ツール不要。
//   osascript -l JavaScript scripts/make-icons.js <出力先ディレクトリ>
//
// デザイン: 暗い角丸の地に三日月と八分音符。明るいツールバーでも暗いツールバーでも見えるよう、
// 地は暗く・図柄は明るくし、縁に細い明るめの線を入れている。
// 小さいサイズ（16/32）では音符が潰れるので三日月だけにする。

ObjC.import('AppKit');

const BG = [0x22, 0x23, 0x2e];
const RIM = [0x4a, 0x4c, 0x60];
const MOON = [0xf5, 0xd9, 0x7a];
const NOTE = [0xf2, 0xf2, 0xf5];

function color(rgb, a) {
  return $.NSColor.colorWithSRGBRedGreenBlueAlpha(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, a === undefined ? 1 : a);
}

function oval(cx, cy, rx, ry) {
  return $.NSBezierPath.bezierPathWithOvalInRect($.NSMakeRect(cx - rx, cy - ry, rx * 2, ry * 2));
}

// 座標は 128×128、原点は左下（AppKit の座標系）
function draw(size) {
  const withNote = size >= 48;

  // 地
  const bgRect = $.NSMakeRect(6, 6, 116, 116);
  const bg = $.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius(bgRect, 28, 28);
  color(BG).setFill;
  bg.fill;

  // 縁（暗いツールバーで輪郭が分かるように）
  const rim = $.NSBezierPath.bezierPathWithRoundedRectXRadiusYRadius($.NSMakeRect(7.5, 7.5, 113, 113), 26.5, 26.5);
  rim.lineWidth = size <= 16 ? 6 : 3;
  color(RIM).setStroke;
  rim.stroke;

  // 三日月（大きい円から、右上にずらした円を地の色で塗りつぶす）
  $.NSGraphicsContext.saveGraphicsState;
  bg.addClip;
  color(MOON).setFill;
  const mr = withNote ? 40 : 44;
  oval(60, 62, mr, mr).fill;
  color(BG).setFill;
  oval(60 + mr * 0.42, 62 + mr * 0.36, mr * 0.84, mr * 0.84).fill;
  $.NSGraphicsContext.restoreGraphicsState;

  if (withNote) {
    // 八分音符（三日月の内側の空いた所）
    color(NOTE).setFill;
    const head = oval(0, 0, 9, 6.5);
    const t = $.NSAffineTransform.transform;
    t.translateXByYBy(76, 56);
    t.rotateByDegrees(-24);
    head.transformUsingAffineTransform(t);
    head.fill;
    const stem = $.NSBezierPath.bezierPathWithRect($.NSMakeRect(82.2, 58, 4, 34));
    stem.fill;
    const flag = $.NSBezierPath.bezierPath;
    flag.moveToPoint($.NSMakePoint(82.2, 92));
    flag.curveToPointControlPoint1ControlPoint2($.NSMakePoint(97, 76), $.NSMakePoint(90, 86), $.NSMakePoint(100, 84));
    flag.curveToPointControlPoint1ControlPoint2($.NSMakePoint(86.2, 84), $.NSMakePoint(96, 80), $.NSMakePoint(90, 82));
    flag.closePath;
    flag.fill;
  }
}

function render(size, path) {
  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, size, size, 8, 4, true, false, $.NSDeviceRGBColorSpace, 0, 0);
  const ctx = $.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext(ctx);
  ctx.imageInterpolation = $.NSImageInterpolationHigh;
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
  for (const size of [16, 32, 48, 128]) render(size, `${dir}/${size}.png`);
  return 'wrote ' + dir;
}
