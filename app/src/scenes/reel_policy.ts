// reel policy (9:16, Hindi): "Jev सिर्फ़ judgment देता है। / Threshold 0.90, तो ticket review में। /
// 0.80 करो, सीधा technical को route। / Action आपका code लेता है।"
import type { Frame } from '../engine/scene';
import { ReelPlate, wordIn, at, riseMixed, fitSize, typed, pen, F, font, rgba, ease, clamp, COL } from './_vo';
import { lerp } from '../engine/util';

const X0 = 44, X1 = COL.w - 44, Y = 450;
const xOf = (v: number) => lerp(X0, X1, v);

export default class ReelPolicy extends ReelPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const judgment = wordIn(ly, 'judgment', 'judgment').start;
    const thr = wordIn(ly, 'Threshold', 'Threshold').start;
    const review = wordIn(ly, 'Threshold', 'review').start;
    const w80 = wordIn(ly, '0.80', '0.80').start;
    const route = wordIn(ly, '0.80', 'route').start;
    const code = wordIn(ly, 'Action', 'code').start;

    const t1 = 'Jev judges.', t2 = 'Your code decides.';
    riseMixed(c, t1, X0, 190, at(t, judgment - 0.15, 0.4), fitSize(c, t1, 62, 900, X1 - X0), 900, rgba('bone'));
    riseMixed(c, t2, X0, 262, at(t, code - 0.1, 0.4), fitSize(c, t2, 62, 900, X1 - X0), 900, rgba('signal'));

    // scale 0..1
    pen(c, [[X0, Y], [X1, Y]], at(t, judgment, 0.6, ease.inOutCubic), t, { color: rgba('bone', 0.7), width: 3 });
    for (let k = 0; k <= 10; k++) {
      const a = at(t, judgment + 0.2 + k * 0.03, 0.2);
      if (a <= 0) continue;
      c.save();
      c.globalAlpha = a; c.fillStyle = rgba('bone', 0.6);
      c.fillRect(xOf(k / 10) - 1, Y - (k % 5 ? 8 : 14), 2, k % 5 ? 16 : 28);
      if (k % 5 === 0) { c.font = font(F.mono(400), 22); c.textAlign = 'center'; c.fillStyle = rgba('ash'); c.fillText((k / 10).toFixed(1), xOf(k / 10), Y + 52); }
      c.restore();
    }
    // Jev's probability (0.85): a filled bar above the scale
    const fill = at(t, judgment + 0.4, 0.8, ease.outCubic);
    if (fill > 0) {
      c.fillStyle = rgba('signal', 0.9); c.fillRect(X0, Y - 62, (xOf(0.85) - X0) * fill, 30);
      typed(c, `p(technical) = ${(0.85 * fill).toFixed(2)}`, X0, Y - 76, 1, 22, rgba('bone'), 500);
    }
    // threshold marker: appears at 0.90 on 'Threshold', slides to 0.80 on '0.80'
    const show = at(t, thr - 0.05, 0.3);
    if (show > 0) {
      const v = lerp(0.9, 0.8, at(t, w80 - 0.05, 0.7, ease.inOutCubic));
      const x = xOf(v);
      c.save();
      c.globalAlpha = show;
      c.fillStyle = rgba('bone'); c.fillRect(x - 3, Y - 100, 6, 130);
      c.font = font(F.mono(600), 22); c.textAlign = 'center';
      c.fillText(`threshold ${v.toFixed(2)}`, Math.min(x, COL.w - 110), Y - 112);
      c.restore();
    }
    // verdict
    const toReview = at(t, review - 0.1, 0.3), toRoute = at(t, route - 0.1, 0.25, ease.outBack);
    if (toReview > 0 && toRoute <= 0) {
      riseMixed(c, 'send to review', X0, 585, toReview, 46, 900, rgba('ash'));
    }
    if (toRoute > 0) {
      c.save(); c.translate(X0, 585); const s = 1.15 - 0.15 * toRoute; c.scale(s, s); c.globalAlpha = clamp(toRoute * 1.4);
      riseMixed(c, 'route → technical', 0, 0, 1, fitSize(c, 'route → technical', 46, 900, X1 - X0), 900, rgba('signal'));
      c.restore();
    }
    // the rule as code
    const cp = at(t, code - 0.3, 1.0, ease.linear);
    typed(c, 'if (p >= THRESHOLD) routeTo(team)', X0, 636, cp, 20, rgba('bone', 0.85));
    typed(c, 'else sendToReview(ticket)', X0, 662, clamp(cp * 1.5 - 0.5), 20, rgba('bone', 0.85));
    return { flash: t > route - 0.1 && t < route + 0.05 ? 0.2 : 0 };
  }
}
