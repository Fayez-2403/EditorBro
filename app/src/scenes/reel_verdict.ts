// reel verdict (9:16, Hindi): "LLM लिखता है। / Jev decide करता है। / Code action लेता है। /
// आप कहाँ use करोगे? Comment करो।"
// Ends by imploding into the spark and fading to bare paper, so the last frame loops back to frame 0.
import type { Frame } from '../engine/scene';
import { ReelPlate, wordIn, at, riseMixed, drawMixed, mixedWidth, fitSize, rgba, ease, clamp, COL } from './_vo';
import { sparkHead2D } from './_motifs';

const CY = 400;

export default class ReelVerdict extends ReelPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t, end = this.ctx.end;
    const l1 = wordIn(ly, 'LLM', 1).start;
    const l2 = wordIn(ly, 'Jev decide', 'decide').start;
    const l3 = wordIn(ly, 'Code action', 'action').start;
    const cta = wordIn(ly, 'Comment', 'Comment').start;

    // implode: everything squeezes to the centre in the last second
    const imp = at(t, end - 1.1, 0.55, ease.inCubic);
    const gone = at(t, end - 0.55, 0.3);
    c.save();
    c.translate(COL.cx, CY); c.scale(1 - imp * 0.97, 1 - imp * 0.97); c.translate(-COL.cx, -CY);
    c.globalAlpha = 1 - gone;
    const lines: [string, number, number, string][] = [
      ['LLM writes.', 290, l1, rgba('ash')],
      ['Jev decides.', 410, l2, rgba('signal')],
      ['Code acts.', 530, l3, rgba('bone')],
    ];
    const size = Math.min(...lines.map(([s]) => fitSize(c, s, 72, 900, COL.w - 56)));
    for (const [s, y, w, col] of lines) riseMixed(c, s, COL.cx, y, at(t, w - 0.1, 0.35), size, 900, col, 'center');
    const k = at(t, cta - 0.1, 0.4);
    if (k > 0) {
      c.globalAlpha = (1 - gone) * k;
      const label = 'Where would you use it? ↓', w = mixedWidth(c, label, 38, 700) + 56;
      c.strokeStyle = rgba('signal'); c.lineWidth = 3;
      c.strokeRect(COL.cx - w / 2, 590 + (1 - k) * 16, w, 70);
      drawMixed(c, label, COL.cx, 637 + (1 - k) * 16, 38, 700, rgba('bone', 0.95), 'center');
    }
    c.restore();
    if (imp > 0 && gone < 1) sparkHead2D(c, COL.cx, CY, t, 1.4 * (1 - gone));
    return { bloom: 0.55 + imp * 0.6 * (1 - gone), flash: clamp(imp - 0.85) * 2 * (1 - gone) };
  }
}
