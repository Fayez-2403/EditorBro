// policy: "Jev sirf judgment deta hai. / Threshold 0.90, to ticket review mein. /
// 0.80 karo, seedha technical ko route. / Action aapka code leta hai."
import type { Frame } from '../engine/scene';
import { VoPlate, wordOf, at, riseText, typed, pen, F, font, rgba, ease, clamp } from './_vo';
import { lerp } from '../engine/util';

const X0 = 240, X1 = 1680, Y = 520;
const xOf = (v: number) => lerp(X0, X1, v);

export default class Policy extends VoPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const judgment = wordOf(ly, 'Jev sirf judgment', 'judgment').start;
    const thr = wordOf(ly, 'Threshold 0.90', 'Threshold').start;
    const review = wordOf(ly, 'Threshold 0.90', 'review').start;
    const w80 = wordOf(ly, '0.80 karo', '0.80').start;
    const route = wordOf(ly, '0.80 karo', 'route').start;
    const code = wordOf(ly, 'Action aapka code', 'code').start;

    riseText(c, 'Jev judges.', 240, 260, at(t, judgment - 0.15, 0.4), F.archivo(100, 900), 96, rgba('bone'));
    riseText(c, 'Your code decides.', 240 + 640, 260, at(t, code - 0.1, 0.4), F.archivo(100, 900), 96, rgba('signal'));

    // scale 0..1
    pen(c, [[X0, Y], [X1, Y]], at(t, judgment, 0.6, ease.inOutCubic), t, { color: rgba('bone', 0.7), width: 3 });
    for (let k = 0; k <= 10; k++) {
      const a = at(t, judgment + 0.2 + k * 0.03, 0.2);
      if (a <= 0) continue;
      c.globalAlpha = a; c.fillStyle = rgba('bone', 0.6);
      c.fillRect(xOf(k / 10) - 1, Y - (k % 5 ? 10 : 18), 2, k % 5 ? 20 : 36);
      if (k % 5 === 0) { c.font = font(F.mono(400), 26); c.textAlign = 'center'; c.fillStyle = rgba('ash'); c.fillText((k / 10).toFixed(1), xOf(k / 10), Y + 62); c.textAlign = 'left'; }
      c.globalAlpha = 1;
    }
    // Jev's probability (0.85): a filled bar above the scale
    const fill = at(t, judgment + 0.4, 0.8, ease.outCubic);
    if (fill > 0) {
      c.fillStyle = rgba('signal', 0.9); c.fillRect(X0, Y - 70, (xOf(0.85) - X0) * fill, 34);
      typed(c, `p(technical) = ${(0.85 * fill).toFixed(2)}`, X0, Y - 92, 1, 28, rgba('bone'), 500);
    }
    // threshold marker: appears at 0.90 on 'Threshold', slides to 0.80 on '0.80'
    const show = at(t, thr - 0.05, 0.3);
    if (show > 0) {
      const v = lerp(0.9, 0.8, at(t, w80 - 0.05, 0.7, ease.inOutCubic));
      const x = xOf(v);
      c.globalAlpha = show;
      c.fillStyle = rgba('bone'); c.fillRect(x - 3, Y - 110, 6, 150);
      c.font = font(F.mono(600), 30); c.textAlign = 'center';
      c.fillText(`threshold ${v.toFixed(2)}`, x, Y - 128); c.textAlign = 'left';
      c.globalAlpha = 1;
    }
    // verdict
    const toReview = at(t, review - 0.1, 0.3), toRoute = at(t, route - 0.1, 0.25, ease.outBack);
    if (toReview > 0 && toRoute <= 0) {
      riseText(c, 'send to review', 240, 760, toReview, F.archivo(112, 900), 110, rgba('ash'));
    }
    if (toRoute > 0) {
      c.save(); c.translate(240, 760); const s = 1.15 - 0.15 * toRoute; c.scale(s, s); c.globalAlpha = clamp(toRoute * 1.4);
      c.font = font(F.archivo(112, 900), 110); c.fillStyle = rgba('signal'); c.fillText('route → technical', 0, 0); c.restore();
    }
    // the rule as code
    typed(c, 'if (p >= THRESHOLD) routeTo(team) else sendToReview(ticket)', 240, 870, at(t, code - 0.3, 1.0, ease.linear), 30, rgba('bone', 0.85));
    return { flash: t > route - 0.1 && t < route + 0.05 ? 0.2 : 0 };
  }
}
