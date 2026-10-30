// Night-trek template, hook: "400+" and the promise up from frame 0, the real poster from the post explored by a
// camera (title, then a hop across each repo's tree, then pull out).
// params: { line, img (the poster), big, title, pill, stops: [x, y][] (poster px of each tree's title) }
import type { Frame } from '../engine/scene';
import { TrekPlate, TREK, wide, wideFit, riseFont, camAt, loadImg, F, font, clamp, ease, type Pose } from './_vo';

const CX = 24, CW = 560;

export default class TrekHook extends TrekPlate {
  img: ImageBitmap | null = null;
  override async load() { this.img = await loadImg(this.ctx.params.img); }

  draw(c: CanvasRenderingContext2D, t: number, _f: Frame) {
    const p = this.ctx.params, l = this.line, img = this.img;
    // the poster card grows when there is no bottom-right watermark (params.noWatermark)
    const CY = p.noWatermark ? 272 : 292, CH = p.noWatermark ? 484 : 430, PILL = p.noWatermark ? 776 : 754;
    const PW = img?.width ?? 2896, PH = img?.height ?? 4096;
    // the poster ladder: title, the five trees, pull out
    const stops: [number, number][] = p.stops;
    const hop0 = this.frac(0.2), hop1 = this.frac(0.85), step = (hop1 - hop0) / stops.length;
    // frame 0 shows the poster's whole headline (x 131..2017, y ~175), then the hops begin
    const poses: Pose[] = [{ t: 0, x: 1100, y: 330, z: 1.45 }, { t: hop0 - 0.1, x: 1100, y: 330, z: 1.45 }];
    stops.forEach(([x, y], i) => poses.push({ t: hop0 + step * (i + 0.6), x, y: y + 260, z: 2.4 }));
    poses.push({ t: l.end + 0.1, x: PW / 2, y: PH * 0.42, z: 1.0 });
    const cam = camAt(poses, t);

    // "400+" lands on frame 0 with a short punch, then the promise rises in
    const k = ease.outBack(clamp(t / 0.3));
    c.save(); c.translate(CX, 196); c.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
    c.font = wide(132, 900); c.fillStyle = TREK.lime; c.textBaseline = 'alphabetic'; c.fillText(p.big, 0, 0);
    c.restore();
    const ts = wideFit(c, p.title, 30, CW);
    riseFont(c, p.title, CX, 250, clamp((t - 0.15) / 0.35), wide(ts, 900), ts, TREK.white);

    // the poster card
    c.save();
    c.shadowColor = 'rgba(142, 68, 255, 0.4)'; c.shadowBlur = 40; c.shadowOffsetY = 12;
    c.beginPath(); c.roundRect(CX, CY, CW, CH, 18); c.fillStyle = '#0D0D12'; c.fill();
    c.restore();
    c.save(); c.beginPath(); c.roundRect(CX, CY, CW, CH, 18); c.clip();
    if (img) { const vw = PW / cam.z, vh = vw * CH / CW; c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(img, cam.x - vw / 2, cam.y - vh / 2, vw, vh, CX, CY, CW, CH); }
    c.restore();
    c.save(); c.strokeStyle = TREK.lime; c.lineWidth = 2; c.beginPath(); c.roundRect(CX, CY, CW, CH, 18); c.stroke(); c.restore();
    // which repo the camera is on: a counter chip on the card
    const i = Math.floor(clamp((t - hop0) / step, 0, stops.length - 0.001));
    if (t > hop0) {
      c.save(); c.font = font(F.mono(700), 14); const s = `REPO ${i + 1} / ${stops.length}`, w = c.measureText(s).width + 20;
      c.fillStyle = TREK.lime; c.beginPath(); c.roundRect(CX + CW - w - 12, CY + 12, w, 26, 13); c.fill();
      c.fillStyle = TREK.night; c.textBaseline = 'middle'; c.fillText(s, CX + CW - w - 2, CY + 26); c.restore();
    }
    // the pill
    const pa = clamp((t - this.frac(0.45)) / 0.35);
    if (pa > 0) {
      c.save(); c.globalAlpha = pa; c.translate(0, (1 - ease.outCubic(pa)) * 16);
      c.font = font(F.mono(700), 17); const w = c.measureText(p.pill).width + 36;
      c.fillStyle = TREK.purple; c.beginPath(); c.roundRect(CX, PILL, w, 40, 20); c.fill();
      c.fillStyle = TREK.white; c.textBaseline = 'middle'; c.fillText(p.pill, CX + 18, PILL + 21); c.restore();
    }
    return { bloom: 0.3 };
  }
}
