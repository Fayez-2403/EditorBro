// reel answers (9:16, Hindi): "सिर्फ़ तीन answers। / Choice, options में से एक। / Score, एक scale पर। /
// Noul, हाँ या ना की probability।"
import type { Frame } from '../engine/scene';
import { ReelPlate, wordIn, at, riseMixed, fitSize, typed, pen, F, font, rgba, ease, clamp, COL } from './_vo';

const X = 34, CW = COL.w - 68, CH = 130, TOPS = [240, 385, 530];

export default class ReelAnswers extends ReelPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const teen = wordIn(ly, 'answers', 1).start;
    const choice = wordIn(ly, 'Choice', 0).start;
    const ek = wordIn(ly, 'Choice', 4).start;
    const score = wordIn(ly, 'Score', 0).start;
    const scale = wordIn(ly, 'Score', 'scale').start;
    const noul = wordIn(ly, 'Noul', 0).start;
    const prob = wordIn(ly, 'Noul', 'probability').start;

    riseMixed(c, 'Three answer types.', COL.cx, 190, at(t, teen - 0.2, 0.5), fitSize(c, 'Three answer types.', 54, 700), 700, rgba('bone'), 'center');

    // card frames, drawn by the pen in turn
    const starts = [choice, score, noul];
    starts.forEach((s, i) => {
      const top = TOPS[i]!;
      pen(c, [[X, top], [X + CW, top], [X + CW, top + CH], [X, top + CH], [X, top]], at(t, s - 0.15, 0.55, ease.inOutCubic), t, { color: rgba('graphite', 0.9), width: 2 });
      const active = t >= s && (i === 2 || t < starts[i + 1]!);
      riseMixed(c, ['choice', 'score', 'noul'][i]!, X + 22, top + 46, at(t, s, 0.35), 34, 600, rgba(active ? 'signal' : 'bone'));
    });

    // choice: three options in a row, one gets picked on 'एक'
    ['billing', 'technical', 'other'].forEach((o, k) => {
      const a = at(t, choice + 0.25 + k * 0.12, 0.3);
      if (a <= 0) return;
      c.save();
      c.globalAlpha = a;
      c.font = font(F.mono(400), 24);
      const x = [X + 22, X + 22 + 34 + 101 + 10, X + 22 + 34 + 101 + 10 + 34 + 130 + 10][k]!, y = TOPS[0]! + 104;
      c.strokeStyle = rgba('bone', 0.8); c.lineWidth = 3;
      c.beginPath(); c.arc(x + 10, y - 8, 10, 0, Math.PI * 2); c.stroke();
      const pick = k === 1 ? at(t, ek, 0.25, ease.outBack) : 0;
      if (pick > 0) { c.fillStyle = rgba('signal'); c.beginPath(); c.arc(x + 10, y - 8, 6 * pick, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = rgba(k === 1 && pick > 0 ? 'bone' : 'ash');
      c.fillText(o, x + 28, y);
      c.restore();
    });

    // score: an ordered rubric 0..2 with a marker that settles on 1 on 'scale'
    {
      const x0 = X + 60, x1 = X + CW - 72, y = TOPS[1]! + 82;
      pen(c, [[x0, y], [x1, y]], at(t, score + 0.2, 0.5, ease.inOutCubic), t, { color: rgba('bone', 0.8), width: 3 });
      ['0 calm', '1 frustrated', '2 hostile'].forEach((lab, k) => {
        const x = x0 + (k / 2) * (x1 - x0), a = at(t, score + 0.3 + k * 0.1, 0.3);
        if (a <= 0) return;
        c.save();
        c.globalAlpha = a; c.fillStyle = rgba('bone', 0.8);
        c.fillRect(x - 2, y - 10, 4, 20);
        c.font = font(F.mono(400), 18); c.textAlign = 'center'; c.fillStyle = rgba('ash');
        c.fillText(lab, x, y + 38);
        c.restore();
      });
      const m = at(t, scale, 0.6, ease.outCubic);
      if (m > 0) {
        const x = x0 + 0.5 * m * (x1 - x0);
        c.fillStyle = rgba('signal');
        c.beginPath(); c.moveTo(x, y - 14); c.lineTo(x - 11, y - 34); c.lineTo(x + 11, y - 34); c.closePath(); c.fill();
      }
    }

    // noul: a dial 0..1, the needle sweeps on 'probability'
    {
      const cx = X + CW - 110, cy = TOPS[2]! + 100, R = 56;
      const arcP = at(t, noul + 0.2, 0.6, ease.inOutCubic);
      if (arcP > 0) {
        c.strokeStyle = rgba('bone', 0.8); c.lineWidth = 3;
        c.beginPath(); c.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * arcP); c.stroke();
        c.save();
        c.font = font(F.mono(400), 18); c.fillStyle = rgba('ash'); c.globalAlpha = arcP;
        c.fillText('0', cx - R - 4, cy + 20); c.fillText('1', cx + R - 6, cy + 20);
        c.restore();
      }
      const v = at(t, prob - 0.1, 0.9, ease.outCubic);
      if (v > 0) {
        const ang = Math.PI + Math.PI * v;
        c.strokeStyle = rgba('signal'); c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang) * (R - 10), cy + Math.sin(ang) * (R - 10)); c.stroke();
        c.fillStyle = rgba('signal'); c.beginPath(); c.arc(cx, cy, 6, 0, Math.PI * 2); c.fill();
        typed(c, `P(yes)=${v.toFixed(2)}`, X + 22, TOPS[2]! + 100, 1, 24, rgba('bone'), 500);
      }
    }
    return { bloom: 0.6 + 0.2 * clamp(f.a.kick) };
  }
}
