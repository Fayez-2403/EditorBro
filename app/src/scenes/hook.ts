// hook: "ChatGPT likhta hai. / Lekin Jev sirf decide karta hai. / TypeSafe AI ka naya model. /
// Messy text do, typed answer lo."
import type { Frame } from '../engine/scene';
import { VoPlate, wordOf, at, riseText, typed, pen, F, font, measure, rgba, ease, clamp, W } from './_vo';
import { hash } from '../engine/util';

export default class Hook extends VoPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const write = wordOf(ly, 'ChatGPT likhta', 'likhta').start;
    const decide = wordOf(ly, 'Lekin Jev', 'decide').start;
    const model = wordOf(ly, 'TypeSafe AI', 'TypeSafe').start;
    const messy = wordOf(ly, 'Messy text', 'Messy').start;
    const typedW = wordOf(ly, 'Messy text', 'typed').start;

    // the two statements: they shrink up and away once the 'messy -> typed' diagram arrives
    const away = at(t, messy - 0.25, 0.6, ease.inOutCubic);
    c.save();
    c.translate(0, -away * 220);
    c.globalAlpha = 1 - away;

    const serif = F.serif(400, true);
    riseText(c, 'LLMs write.', 200, 430, at(t, write - 0.1, 0.5), serif, 150, rgba('ash'));

    // "Jev decides." slams in on 'decide'
    const slam = at(t, decide - 0.05, 0.22, ease.outBack);
    const heavy = F.archivo(112, 900);
    if (slam > 0) {
      c.save();
      const s = 1.25 - 0.25 * slam;
      c.translate(200, 650); c.scale(s, s);
      c.globalAlpha *= clamp(slam * 1.4);
      c.font = font(heavy, 190);
      c.fillStyle = rgba('signal');
      c.fillText('Jev decides.', 0, 0);
      c.restore();
    }
    // 'Jev' is marked a beat before: a small mono tag under the line
    typed(c, '> jev-1.13.0  ·  TypeSafe AI  ·  System One model', 205, 740, at(t, model - 0.05, 1.1, ease.linear), 28, rgba('bone', 0.8));
    // the spark underlines the name as it is spoken
    pen(c, [[200, 680], [200 + measure('Jev decides.', heavy, 190), 680]], at(t, decide + 0.12, 0.7, ease.inOutCubic), t, { color: rgba('signal', 0.9), width: 4 });
    c.restore();

    // messy text -> typed answer
    if (away > 0) {
      c.save();
      c.globalAlpha = away;
      const words = ['plz', 'refund??', 'stripe', 'BROKEN', '3 days', 'help', 'asap', 'sales', 'integration', 'fails'];
      c.font = font(F.mono(400), 30);
      words.forEach((w, i) => {
        const k = at(t, messy + i * 0.05, 0.4);
        const x = 230 + (hash(i, 1) * 420), y = 520 + hash(i, 2) * 300;
        c.save(); c.translate(x, y + (1 - k) * 30); c.rotate((hash(i, 3) - 0.5) * 0.5);
        c.fillStyle = rgba(i % 3 ? 'ash' : 'bone', k * 0.85); c.fillText(w, 0, 0); c.restore();
      });
      riseText(c, 'messy text', 230, 900, at(t, messy, 0.4), F.archivo(87, 500), 34, rgba('graphite'));
      // arrow drawn by the pen
      pen(c, [[760, 680], [1060, 680], [1035, 660], [1060, 680], [1035, 700]], at(t, messy + 0.5, 0.7, ease.inOutCubic), t, { color: rgba('signal'), width: 4 });
      // typed answer card
      const k = at(t, typedW - 0.05, 0.4);
      if (k > 0) {
        c.globalAlpha = away * k;
        c.strokeStyle = rgba('bone', 0.7); c.lineWidth = 2;
        c.strokeRect(1110, 560 + (1 - k) * 20, 600, 230);
        c.font = font(F.mono(500), 34); c.fillStyle = rgba('bone');
        c.fillText('{ team: "technical",', 1140, 640 + (1 - k) * 20);
        c.fillStyle = rgba('signal'); c.fillText('  p: 0.85 }', 1140, 700 + (1 - k) * 20);
        riseText(c, 'typed answer', 1110, 900, k, F.archivo(87, 500), 34, rgba('graphite'));
      }
      c.restore();
    }
    return { flash: Math.max(0, 1 - (t - decide) / 0.12) * (t > decide ? 0.35 : 0), shake: t > decide && t < decide + 0.2 ? [Math.sin(t * 90) * 3 * (1 - (t - decide) / 0.2), 0] as [number, number] : [0, 0] as [number, number] };
  }
}
void W;
