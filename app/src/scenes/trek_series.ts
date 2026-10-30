// Night-trek template, series hook: "PART n/N", the part's title, and this part's real repo pages flying in as a fan
// of browser cards with their live stars. Up from frame 0 (the first line holds the promise).
// params: { line, part, kicker, title, title2, cards: { img, url, stars }[] }
import type { Frame } from '../engine/scene';
import { TrekPlate, TREK, wide, wideFit, riseFont, browser, starBadge, loadImg, F, font, clamp, ease } from './_vo';

export default class TrekSeries extends TrekPlate {
  imgs: (ImageBitmap | null)[] = [];
  override async load() { this.imgs = await Promise.all((this.ctx.params.cards as { img: string }[]).map((c) => loadImg(c.img))); }

  draw(c: CanvasRenderingContext2D, t: number, _f: Frame) {
    const p = this.ctx.params, cards: { img: string; url: string; stars: number }[] = p.cards, n = cards.length;
    // the chip and the kicker, on frame 0
    c.save();
    c.font = wide(20, 900); const cw = c.measureText(p.part).width + 30;
    c.fillStyle = TREK.lime; c.beginPath(); c.roundRect(20, 118, cw, 38, 19); c.fill();
    c.fillStyle = TREK.night; c.textBaseline = 'middle'; c.fillText(p.part, 35, 138);
    c.font = font(F.mono(600), 15); c.fillStyle = TREK.slate; c.fillText(p.kicker, 20 + cw + 14, 138);
    c.restore();
    // the title: two lines, the second in the accent
    const s1 = wideFit(c, p.title, 64, 568), s2 = wideFit(c, p.title2, 64, 568);
    riseFont(c, p.title, 20, 220, clamp((t + 0.15) / 0.35), wide(s1, 900), s1, TREK.white);
    riseFont(c, p.title2, 20, 220 + s2 * 1.05, clamp((t - 0.1) / 0.35), wide(s2, 900), s2, TREK.lime);
    // the cards: real pages fanning in from below, one after another, then a slow drift
    // card size and spacing keep every card (and its badge) inside the 608-px frame
    const CWd = 448, CHt = 228, top = 330, span = 820 - top - CHt, dx = n > 3 ? 36 : 54;
    cards.forEach((cd, i) => {
      const a = ease.outCubic(clamp((t - 0.25 - i * 0.18) / 0.55));
      if (a <= 0) return;
      const x = 22 + i * dx, y = top + (n > 1 ? (span * i) / (n - 1) : 0), rot = (i % 2 ? 2.2 : -2.6) * (Math.PI / 180);
      const drift = Math.sin(t * 0.8 + i) * 3;
      c.save();
      c.translate(x + CWd / 2, y + CHt / 2 + (1 - a) * 260 + drift); c.rotate(rot * a); c.translate(-CWd / 2, -CHt / 2);
      c.globalAlpha = Math.min(1, a * 1.4);
      browser(c, this.imgs[i] ?? null, { x: 640, y: 330, z: 1.35 }, 0, 0, CWd, CHt, cd.url);
      starBadge(c, CWd, 0, cd.stars, clamp((t - 0.55 - i * 0.18) / 0.5));
      c.restore();
    });
    return { bloom: 0.3 };
  }
}
