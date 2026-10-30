// verdict: "LLM likhta hai. / Jev decide karta hai. / Code action leta hai. / Aap kahan use karoge? Comment karo."
// Ends by imploding into the spark and fading to bare paper, so the last frame loops back to frame 0.
import type { Frame } from '../engine/scene';
import { VoPlate, wordOf, at, riseText, F, font, rgba, ease, clamp, W } from './_vo';
import { sparkHead2D } from './_motifs';

export default class Verdict extends VoPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t, end = this.ctx.end;
    const l1 = wordOf(ly, 'LLM likhta', 'likhta').start;
    const l2 = wordOf(ly, 'Jev decide karta', 'decide').start;
    const l3 = wordOf(ly, 'Code action', 'action').start;
    const cta = wordOf(ly, 'Comment karo', 'Comment').start;

    // implode: everything squeezes to the centre in the last second
    const imp = at(t, end - 1.1, 0.55, ease.inCubic);
    const gone = at(t, end - 0.55, 0.3);
    this.captions = imp <= 0;
    c.save();
    c.translate(W / 2, 520); c.scale(1 - imp * 0.97, 1 - imp * 0.97); c.translate(-W / 2, -520);
    c.globalAlpha = 1 - gone;
    const big = F.archivo(112, 900);
    riseText(c, 'LLM writes.', W / 2, 360, at(t, l1 - 0.1, 0.35), big, 130, rgba('ash'), 'center');
    riseText(c, 'Jev decides.', W / 2, 530, at(t, l2 - 0.1, 0.35), big, 130, rgba('signal'), 'center');
    riseText(c, 'Code acts.', W / 2, 700, at(t, l3 - 0.1, 0.35), big, 130, rgba('bone'), 'center');
    const k = at(t, cta - 0.1, 0.4);
    if (k > 0) {
      c.globalAlpha = (1 - gone) * k;
      c.font = font(F.mono(500), 40); c.textAlign = 'center'; c.fillStyle = rgba('bone', 0.9);
      c.fillText('Aap kahan use karoge?  ↓  comment karo', W / 2, 840); c.textAlign = 'left';
    }
    c.restore();
    if (imp > 0 && gone < 1) sparkHead2D(c, W / 2, 520, t, 1.4 * (1 - gone));
    return { bloom: 0.55 + imp * 0.6 * (1 - gone), flash: clamp(imp - 0.85) * 2 * (1 - gone) };
  }
}
