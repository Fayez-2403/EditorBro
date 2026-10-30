// answers: "Sirf teen answers. / Choice, options mein se ek. / Score, ek scale pe. /
// Noul, haan ya na ki probability."
import type { Frame } from '../engine/scene';
import { VoPlate, wordOf, at, riseText, typed, pen, F, font, rgba, ease, clamp } from './_vo';

const COLS = [180, 760, 1340];
const TOP = 330;

export default class Answers extends VoPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const teen = wordOf(ly, 'Sirf teen answers', 'teen').start;
    const choice = wordOf(ly, 'Choice, options', 'Choice').start;
    const ek = wordOf(ly, 'Choice, options', 'ek').start;
    const score = wordOf(ly, 'Score, ek scale', 'Score').start;
    const scale = wordOf(ly, 'Score, ek scale', 'scale').start;
    const noul = wordOf(ly, 'Noul, haan', 'Noul').start;
    const prob = wordOf(ly, 'Noul, haan', 'probability').start;

    riseText(c, 'Three answer types. That’s the whole API.', 180, 200, at(t, teen - 0.1, 0.5), F.archivo(100, 700), 64, rgba('bone'));

    // column frames, drawn by the pen in turn
    const starts = [choice, score, noul];
    starts.forEach((s, i) => {
      const x = COLS[i]!;
      pen(c, [[x, TOP], [x + 400, TOP], [x + 400, TOP + 470], [x, TOP + 470], [x, TOP]], at(t, s - 0.15, 0.55, ease.inOutCubic), t, { color: rgba('graphite', 0.9), width: 2 });
      const active = t >= s && (i === 2 || t < starts[i + 1]!);
      riseText(c, ['choice', 'score', 'noul'][i]!, x + 30, TOP + 90, at(t, s, 0.35), F.mono(600), 58, rgba(active ? 'signal' : 'bone'));
    });

    // Choice: three options, one gets picked on 'ek'
    const opts = ['billing', 'technical', 'other'];
    opts.forEach((o, k) => {
      const y = TOP + 180 + k * 80, x = COLS[0]! + 40;
      const a = at(t, choice + 0.25 + k * 0.12, 0.3);
      if (a <= 0) return;
      c.globalAlpha = a;
      c.strokeStyle = rgba('bone', 0.8); c.lineWidth = 3;
      c.beginPath(); c.arc(x + 14, y - 12, 14, 0, Math.PI * 2); c.stroke();
      const pick = k === 1 ? at(t, ek, 0.25, ease.outBack) : 0;
      if (pick > 0) { c.fillStyle = rgba('signal'); c.beginPath(); c.arc(x + 14, y - 12, 8 * pick, 0, Math.PI * 2); c.fill(); }
      c.font = font(F.mono(400), 34); c.fillStyle = rgba(k === 1 && pick > 0 ? 'bone' : 'ash');
      c.fillText(o, x + 48, y);
      c.globalAlpha = 1;
    });

    // Score: an ordered rubric 0..2 with a marker that settles on 1 on 'scale'
    {
      const x0 = COLS[1]! + 50, x1 = COLS[1]! + 350, y = TOP + 300;
      pen(c, [[x0, y], [x1, y]], at(t, score + 0.2, 0.5, ease.inOutCubic), t, { color: rgba('bone', 0.8), width: 3 });
      ['calm', 'frustrated', 'hostile'].forEach((lab, k) => {
        const x = x0 + (k / 2) * (x1 - x0), a = at(t, score + 0.3 + k * 0.1, 0.3);
        if (a <= 0) return;
        c.globalAlpha = a; c.fillStyle = rgba('bone', 0.8);
        c.fillRect(x - 2, y - 14, 4, 28);
        c.font = font(F.mono(400), 24); c.textAlign = 'center'; c.fillStyle = rgba('ash');
        c.fillText(String(k), x, y + 52); c.fillText(lab, x, y + 84); c.textAlign = 'left';
        c.globalAlpha = 1;
      });
      const m = at(t, scale, 0.6, ease.outCubic);
      if (m > 0) {
        const x = x0 + (0.0 + 0.5 * m) * (x1 - x0);
        c.fillStyle = rgba('signal');
        c.beginPath(); c.moveTo(x, y - 22); c.lineTo(x - 14, y - 46); c.lineTo(x + 14, y - 46); c.closePath(); c.fill();
      }
    }

    // Noul: a dial 0..1, the needle sweeps on 'probability'
    {
      const cx = COLS[2]! + 200, cy = TOP + 360, R = 130;
      const arcP = at(t, noul + 0.2, 0.6, ease.inOutCubic);
      if (arcP > 0) {
        c.strokeStyle = rgba('bone', 0.8); c.lineWidth = 3;
        c.beginPath(); c.arc(cx, cy, R, Math.PI, Math.PI + Math.PI * arcP); c.stroke();
        c.font = font(F.mono(400), 26); c.fillStyle = rgba('ash');
        c.globalAlpha = arcP; c.fillText('0', cx - R - 8, cy + 36); c.fillText('1', cx + R - 8, cy + 36); c.globalAlpha = 1;
      }
      const v = at(t, prob - 0.1, 0.9, ease.outCubic);
      if (v > 0) {
        const ang = Math.PI + Math.PI * v;
        c.strokeStyle = rgba('signal'); c.lineWidth = 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang) * (R - 18), cy + Math.sin(ang) * (R - 18)); c.stroke();
        c.fillStyle = rgba('signal'); c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI * 2); c.fill();
        typed(c, `P(yes) = ${v.toFixed(2)}`, cx - 110, cy - 160, 1, 30, rgba('bone'), 500);
      }
    }
    return { bloom: 0.6 + 0.2 * clamp(f.a.kick) };
  }
}
