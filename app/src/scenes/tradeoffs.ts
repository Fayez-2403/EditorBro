// tradeoffs: "Classify aur route ke liye perfect. / Lekin maths, counting, ya text likhna? /
// Jev nahi. / Aur zero schema error ka matlab sahi answer nahi."
import type { Frame } from '../engine/scene';
import { VoPlate, wordOf, at, riseText, pen, F, font, rgba, ease, clamp, measure } from './_vo';

export default class Tradeoffs extends VoPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const cls = wordOf(ly, 'Classify aur', 'Classify').start;
    const rte = wordOf(ly, 'Classify aur', 'route').start;
    const perfect = wordOf(ly, 'Classify aur', 'perfect').start;
    const maths = wordOf(ly, 'Lekin maths', 'maths').start;
    const counting = wordOf(ly, 'Lekin maths', 'counting').start;
    const text = wordOf(ly, 'Lekin maths', 'text').start;
    const nahi = wordOf(ly, 'Jev nahi', 'nahi').start;
    const schema = wordOf(ly, 'zero schema', 'schema').start;
    const sahi = wordOf(ly, 'zero schema', 'sahi').start;

    const head = F.archivo(87, 700), item = F.archivo(100, 500);
    // left: use it for
    riseText(c, 'use Jev for', 200, 250, at(t, cls - 0.2, 0.35), head, 44, rgba('graphite'));
    ([['classify', cls], ['route', rte], ['score / verify', perfect]] as const).forEach(([s, w], i) => {
      const y = 340 + i * 90, a = at(t, w - 0.05, 0.35);
      riseText(c, s, 260, y, a, item, 64, rgba('bone'));
      pen(c, [[200, y - 22], [214, y - 8], [238, y - 40]], at(t, w + 0.05, 0.25), t, { color: rgba('signal'), width: 5, spark: false });
    });
    // right: not for — each word is struck through as it is said
    riseText(c, 'not for', 1060, 250, at(t, maths - 0.25, 0.35), head, 44, rgba('graphite'));
    ([['maths', maths], ['counting', counting], ['writing text', text]] as const).forEach(([s, w], i) => {
      const y = 340 + i * 90, a = at(t, w - 0.08, 0.3);
      riseText(c, s, 1060, y, a, item, 64, rgba('ash'));
      const len = measure(s, item, 64);
      pen(c, [[1050, y - 22], [1070 + len, y - 22]], at(t, w + 0.12, 0.3, ease.inOutCubic), t, { color: rgba('signal'), width: 6 });
    });
    // 'Jev nahi.'
    const n = at(t, nahi - 0.05, 0.2, ease.outBack);
    if (n > 0) {
      c.save(); c.translate(1060, 690); c.globalAlpha = clamp(n * 1.5); const s = 1.2 - 0.2 * n; c.scale(s, s);
      c.font = font(F.archivo(112, 900), 90); c.fillStyle = rgba('signal'); c.fillText('Jev nahi.', 0, 0); c.restore();
    }
    // 0 schema errors ≠ correct
    const e = at(t, schema - 0.1, 0.4);
    if (e > 0) {
      c.globalAlpha = e;
      c.font = font(F.mono(600), 48); c.fillStyle = rgba('bone');
      c.fillText('0 schema errors', 200, 860);
      c.globalAlpha = 1;
    }
    const neq = at(t, sahi - 0.1, 0.35);
    if (neq > 0) {
      c.font = font(F.mono(600), 48);
      const x = 200 + measure('0 schema errors', F.mono(600), 48) + 40;
      c.fillStyle = rgba('signal'); c.globalAlpha = neq; c.fillText('≠', x, 860);
      c.fillStyle = rgba('bone'); c.fillText('correct answer', x + 70, 860); c.globalAlpha = 1;
    }
    return { flash: t > nahi && t < nahi + 0.08 ? 0.18 : 0 };
  }
}
