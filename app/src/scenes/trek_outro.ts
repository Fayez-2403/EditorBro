// Night-trek template, outro: "START WITH <repo>", the five repos stacking with their live stars, then the final
// lockup: the Techpe Trek logo large and the call to action, held to the end (no watermark here).
// params: { line, kicker, pick, rows: { name, stars }[], cta, sub }
import type { Frame } from '../engine/scene';
import { TrekPlate, TREK, wide, wideFit, riseFont, F, font, clamp, ease } from './_vo';

export default class TrekOutro extends TrekPlate {
  draw(c: CanvasRenderingContext2D, t: number, _f: Frame) {
    const p = this.ctx.params, l = this.line;
    const lock = this.frac(0.62);   // the lockup takes over
    const away = ease.inOutCubic(clamp((t - lock) / 0.4));
    // part 1: start with ... and the five repos
    c.save(); c.globalAlpha = 1 - away; c.translate(0, -away * 60);
    riseFont(c, p.kicker, 24, 190, clamp((t - (l.start - 0.1)) / 0.35), wide(30, 900), 30, TREK.white);
    const ps = wideFit(c, p.pick, 52, 560);
    riseFont(c, p.pick, 24, 252, clamp((t - l.start) / 0.4), wide(ps, 900), ps, TREK.lime);
    (p.rows as { name: string; stars: number }[]).forEach((r, i) => {
      const a = clamp((t - (l.start + 0.25 + i * 0.12)) / 0.3);
      if (a <= 0) return;
      const y = 300 + i * 78, hi = r.name === p.pick;
      c.save(); c.globalAlpha *= a; c.translate((1 - ease.outCubic(a)) * 40, 0);
      c.beginPath(); c.roundRect(24, y, 560, 62, 14); c.fillStyle = hi ? TREK.lime : '#12101A'; c.fill();
      c.strokeStyle = hi ? TREK.lime : TREK.line; c.lineWidth = 1.5; c.stroke();
      c.font = wide(22, 900); c.fillStyle = hi ? TREK.night : TREK.lime; c.textBaseline = 'middle'; c.fillText(`0${i + 1}`, 42, y + 32);
      c.font = font(F.mono(600), 19); c.fillStyle = hi ? TREK.night : TREK.white; c.fillText(r.name, 100, y + 32);
      c.font = wide(20, 900); c.textAlign = 'right'; c.fillStyle = hi ? TREK.night : TREK.purple; c.fillText(`★ ${r.stars}K`, 566, y + 32);
      c.restore();
    });
    c.restore();
    // part 2: the lockup
    if (away > 0 && this.logo) {
      const k = 0.7 + 0.3 * ease.outBack(clamp((t - lock) / 0.5));
      c.save(); c.globalAlpha = away; c.translate(304, 380); c.scale(k, k);
      c.globalCompositeOperation = 'lighten'; c.drawImage(this.logo, -170, -170, 340, 340); c.restore();
      const cs = wideFit(c, p.cta, 44, 560);
      riseFont(c, p.cta, 304, 640, clamp((t - lock - 0.2) / 0.4), wide(cs, 900), cs, TREK.lime, 'center');
      c.save(); c.globalAlpha = clamp((t - lock - 0.45) / 0.4); c.font = font(F.mono(700), 18); c.fillStyle = TREK.white; c.textAlign = 'center';
      c.fillText(p.sub, 304, 690); c.restore();
    }
    return {};
  }
}
