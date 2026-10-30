// reel tradeoffs (9:16, Hindi): "Classify और route के लिए perfect। / लेकिन maths, counting, या text लिखना? /
// Jev नहीं। / और zero schema error का मतलब सही answer नहीं।"
import type { Frame } from '../engine/scene';
import { ReelPlate, wordIn, at, riseMixed, drawMixed, mixedWidth, pen, F, font, rgba, ease, clamp, COL } from './_vo';

const X = 40;

export default class ReelTradeoffs extends ReelPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const cls = wordIn(ly, 'Classify', 'Classify').start;
    const rte = wordIn(ly, 'Classify', 'route').start;
    const perfect = wordIn(ly, 'Classify', 'perfect').start;
    const maths = wordIn(ly, 'maths', 'maths').start;
    const counting = wordIn(ly, 'maths', 'counting').start;
    const text = wordIn(ly, 'maths', 'text').start;
    const nahi = wordIn(ly, 'Jev nahi', 1).start;
    const schema = wordIn(ly, 'schema', 'schema').start;
    const sahi = wordIn(ly, 'schema', 6).start;

    // phase 2 (the last line) clears the lists
    const p2 = at(t, schema - 0.3, 0.4);
    c.save();
    c.globalAlpha = 1 - p2;
    const dim = 1 - 0.9 * at(t, nahi - 0.05, 0.25);
    c.globalAlpha *= dim;

    const item = 600;
    riseMixed(c, 'use Jev for', X, 180, at(t, cls - 0.2, 0.35), 30, 700, rgba('graphite'));
    ([['classify', cls], ['route', rte], ['score / verify', perfect]] as const).forEach(([s, w], i) => {
      const y = 250 + i * 60, a = at(t, w - 0.05, 0.35);
      riseMixed(c, s, X + 52, y, a, 44, item, rgba('bone'));
      pen(c, [[X, y - 16], [X + 12, y - 4], [X + 34, y - 32]], at(t, w + 0.05, 0.25), t, { color: rgba('signal'), width: 5, spark: false });
    });

    riseMixed(c, 'not for', X, 450, at(t, maths - 0.25, 0.35), 30, 700, rgba('graphite'));
    ([['maths', maths], ['counting', counting], ['writing text', text]] as const).forEach(([s, w], i) => {
      const y = 520 + i * 60, a = at(t, w - 0.08, 0.3);
      riseMixed(c, s, X + 52, y, a, 44, item, rgba('ash'));
      const len = mixedWidth(c, s, 44, item);
      pen(c, [[X + 42, y - 16], [X + 62 + len, y - 16]], at(t, w + 0.12, 0.3, ease.inOutCubic), t, { color: rgba('signal'), width: 6 });
    });
    c.restore();

    // 'Jev नहीं।'
    const n = at(t, nahi - 0.05, 0.2, ease.outBack);
    if (n > 0) {
      c.save();
      c.globalAlpha = clamp(n * 1.5) * (1 - p2);
      c.translate(COL.cx, 450); const s = 1.2 - 0.2 * n; c.scale(s, s);
      drawMixed(c, 'Not Jev.', 0, 0, 92, 900, rgba('signal'), 'center');
      c.restore();
    }

    // 0 schema errors ≠ सही answer
    const e = at(t, schema - 0.1, 0.4);
    if (e > 0) {
      c.save();
      c.globalAlpha = e;
      c.font = font(F.mono(600), 38); c.textAlign = 'center'; c.fillStyle = rgba('bone');
      c.fillText('0 schema errors', COL.cx, 270 + (1 - e) * 20);
      c.restore();
    }
    const neq = at(t, sahi - 0.1, 0.35, ease.outBack);
    if (neq > 0) {
      c.save();
      c.globalAlpha = clamp(neq * 1.4);
      drawMixed(c, '≠', COL.cx, 420, 130, 700, rgba('signal'), 'center');
      drawMixed(c, 'correct answer', COL.cx, 530, 62, 800, rgba('bone'), 'center');
      c.restore();
    }
    return { flash: t > nahi && t < nahi + 0.08 ? 0.18 : 0 };
  }
}
