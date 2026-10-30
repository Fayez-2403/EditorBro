// reel hook (9:16, Hindi): "ChatGPT लिखता है। / लेकिन Jev सिर्फ़ decide करता है। / TypeSafe AI का नया model। /
// Messy text दो, typed answer लो।"
import type { Frame } from '../engine/scene';
import { ReelPlate, wordIn, at, drawMixed, riseMixed, riseText, mixedWidth, typed, pen, F, font, rgba, ease, clamp, COL } from './_vo';
import { hash } from '../engine/util';

const CX = COL.cx;

export default class ReelHook extends ReelPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const write = wordIn(ly, 'ChatGPT', 1).start;
    const decide = wordIn(ly, 'Lekin Jev', 'decide').start;
    const model = wordIn(ly, 'TypeSafe', 'TypeSafe').start;
    const messy = wordIn(ly, 'Messy text', 'Messy').start;
    const typedW = wordIn(ly, 'Messy text', 'typed').start;

    // the two statements shrink up and away once the 'messy -> typed' diagram arrives
    const away = at(t, messy - 0.25, 0.6, ease.inOutCubic);
    c.save();
    c.translate(0, -away * 170);
    c.globalAlpha = 1 - away;

    riseText(c, 'LLMs write.', CX, 290, at(t, write - 0.1, 0.5), F.serif(400, true), 92, rgba('ash'), 'center');

    // "Jev decide करता है।" slams in on 'decide'
    const slam = at(t, decide - 0.05, 0.22, ease.outBack);
    if (slam > 0) {
      c.save();
      const s = 1.25 - 0.25 * slam;
      c.translate(CX, 450); c.scale(s, s);
      c.globalAlpha *= clamp(slam * 1.4);
      drawMixed(c, 'Jev', 0, 0, 170, 900, rgba('signal'), 'center');
      drawMixed(c, 'decides.', 0, 96, 76, 900, rgba('signal'), 'center');
      c.restore();
    }
    // the spark underlines the name as it is spoken
    const jw = mixedWidth(c, 'Jev', 170, 900);
    pen(c, [[CX - jw / 2, 478], [CX + jw / 2, 478]], at(t, decide + 0.12, 0.7, ease.inOutCubic), t, { color: rgba('signal', 0.9), width: 4 });
    // a small mono tag
    const tp = at(t, model - 0.05, 1.1, ease.linear);
    typed(c, '> jev-1.13.0', 60, 610, tp, 24, rgba('bone', 0.8));
    typed(c, '  TypeSafe AI · System One model', 60, 644, clamp(tp * 1.4 - 0.25), 24, rgba('bone', 0.8));
    c.restore();

    // messy text -> typed answer
    if (away > 0) {
      c.save();
      c.globalAlpha = away;
      const words = ['plz', 'refund??', 'stripe', 'BROKEN', '3 days', 'help', 'asap', 'sales', 'integration', 'fails'];
      c.font = font(F.mono(400), 26);
      words.forEach((w, i) => {
        const k = at(t, messy + i * 0.05, 0.4);
        // two columns of five, jittered: never overlapping and always inside the column
        const x = (i % 2 ? 270 : 40) + hash(i, 1) * 36, y = 190 + Math.floor(i / 2) * 38 + hash(i, 2) * 10;
        c.save(); c.translate(x, y + (1 - k) * 30); c.rotate((hash(i, 3) - 0.5) * 0.5);
        c.fillStyle = rgba(i % 3 ? 'ash' : 'bone', k * 0.85); c.fillText(w, 0, 0); c.restore();
      });
      riseMixed(c, 'messy text', CX, 392, at(t, messy, 0.4), 30, 500, rgba('graphite'), 'center');
      pen(c, [[CX, 415], [CX, 485], [CX - 15, 466], [CX, 485], [CX + 15, 466]], at(t, messy + 0.5, 0.7, ease.inOutCubic), t, { color: rgba('signal'), width: 4 });
      // typed answer card
      const k = at(t, typedW - 0.05, 0.4);
      if (k > 0) {
        const dy = (1 - k) * 20;
        c.globalAlpha = away * k;
        c.strokeStyle = rgba('bone', 0.7); c.lineWidth = 2;
        c.strokeRect(54, 530 + dy, 500, 120);
        c.font = font(F.mono(500), 30); c.fillStyle = rgba('bone');
        c.fillText('{ team: "technical",', 84, 586 + dy);
        c.fillStyle = rgba('signal'); c.fillText('  p: 0.85 }', 84, 632 + dy);
        riseMixed(c, 'typed answer', CX, 516, k, 28, 500, rgba('graphite'), 'center');
      }
      c.restore();
    }
    return { flash: Math.max(0, 1 - (t - decide) / 0.12) * (t > decide ? 0.35 : 0), shake: t > decide && t < decide + 0.2 ? [Math.sin(t * 90) * 3 * (1 - (t - decide) / 0.2), 0] as [number, number] : [0, 0] as [number, number] };
  }
}
