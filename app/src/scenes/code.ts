// code: "Ek support ticket diya. / Stripe teen din se fail ho raha hai. / Teen sawaal, ek hi call. /
// Team, technical, 0.85. / Urgent, 1.0. / Sab typed, koi parsing nahi."
import type { Frame } from '../engine/scene';
import { VoPlate, wordOf, lineOf, at, riseText, typed, F, font, rgba, ease, clamp } from './_vo';

const CODE = [
  ['kw', 'await '], ['fn', 'jev.systemOne'], ['', '({'],
  ['nl', ''], ['', '  state: ticket,'],
  ['nl', ''], ['', '  questions: {'],
  ['nl', ''], ['', '    team:    '], ['fn', 'choice'], ['', '(…),'],
  ['nl', ''], ['', '    mood:    '], ['fn', 'score'], ['', '(…),'],
  ['nl', ''], ['', '    urgent:  '], ['fn', 'noul'], ['', '(…),'],
  ['nl', ''], ['', '  },'],
  ['nl', ''], ['', '});'],
] as const;

export default class Code extends VoPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const ticket = wordOf(ly, 'Ek support ticket', 'ticket').start;
    const stripe = lineOf(ly, 'Stripe teen din');
    const call = lineOf(ly, 'Teen sawaal');
    const team = wordOf(ly, 'Team, technical', 'technical').start;
    const p85 = wordOf(ly, 'Team, technical', '0.85');
    const urgent = wordOf(ly, 'Urgent, 1.0', '1.0').start;
    const typedW = wordOf(ly, 'Sab typed', 'typed').start;

    // ticket card (left)
    const k = at(t, ticket - 0.1, 0.45);
    if (k > 0) {
      c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * 24);
      c.fillStyle = rgba('ink2'); c.fillRect(140, 240, 720, 300);
      c.strokeStyle = rgba('graphite'); c.lineWidth = 2; c.strokeRect(140, 240, 720, 300);
      typed(c, 'support ticket #4821', 170, 290, 1, 24, rgba('ash'));
      const msg = ['“I’ve been trying to connect my', 'Stripe account for 3 days and the', 'integration keeps failing. I’m', 'losing sales. Please help ASAP.”'];
      c.font = font(F.serif(400, true), 40);
      msg.forEach((m, i) => { c.fillStyle = rgba('bone', 0.92); c.fillText(m, 170, 350 + i * 46); });
      // highlight the trouble while it is spoken
      const h = at(t, stripe.start, Math.max(0.3, stripe.end - stripe.start), ease.inOutCubic);
      c.fillStyle = rgba('signal', 0.28);
      c.fillRect(165, 368, 640 * h, 50);
      c.restore();
    }

    // the call, typed while 'Teen sawaal, ek hi call' is spoken
    const tp = clamp((t - call.start + 0.1) / Math.max(0.6, call.end - call.start + 0.2));
    if (tp > 0) {
      const total = CODE.reduce((n, [, s]) => n + s.length, 0);
      let shown = Math.floor(tp * total), x = 940, y = 270;
      c.font = font(F.mono(500), 34);
      for (const [kind, s] of CODE) {
        if (kind === 'nl') { x = 940; y += 48; continue; }
        if (shown <= 0) break;
        const part = s.slice(0, shown); shown -= s.length;
        c.fillStyle = kind === 'kw' ? rgba('ash') : kind === 'fn' ? rgba('signal') : rgba('bone');
        c.fillText(part, x, y);
        x += c.measureText(part).width;
      }
      if (tp < 1 && Math.floor(t * 4) % 2 === 0) { c.fillStyle = rgba('signal'); c.fillRect(x + 4, y - 30, 16, 36); }
    }

    // the answers come back typed
    const outY = 740;
    const r1 = at(t, team - 0.05, 0.35);
    if (r1 > 0) {
      c.globalAlpha = r1;
      c.font = font(F.mono(600), 44); c.fillStyle = rgba('bone');
      c.fillText('team   → "technical"', 940, outY);
      // probability bar counts up while '0.85' is spoken
      const v = 0.85 * at(t, p85.start - 0.05, Math.max(0.4, p85.end - p85.start), ease.outCubic);
      c.fillStyle = rgba('graphite', 0.6); c.fillRect(940, outY + 30, 600, 14);
      c.fillStyle = rgba('signal'); c.fillRect(940, outY + 30, 600 * v, 14);
      c.font = font(F.mono(500), 32); c.fillStyle = rgba('signal');
      c.fillText(v.toFixed(2), 1560, outY + 46);
      c.globalAlpha = 1;
    }
    const r2 = at(t, urgent - 0.05, 0.3);
    if (r2 > 0) {
      c.globalAlpha = r2; c.font = font(F.mono(600), 44); c.fillStyle = rgba('bone');
      c.fillText('urgent → 1.0', 940, outY + 110); c.globalAlpha = 1;
    }
    // stamp
    const s = at(t, typedW - 0.05, 0.25, ease.outBack);
    if (s > 0) {
      c.save(); c.translate(400, 700); c.rotate(-0.08); c.scale(1.4 - 0.4 * s, 1.4 - 0.4 * s); c.globalAlpha = clamp(s * 1.5);
      c.strokeStyle = rgba('signal'); c.lineWidth = 5; c.strokeRect(-230, -70, 460, 120);
      c.font = font(F.archivo(112, 900), 56); c.fillStyle = rgba('signal'); c.textAlign = 'center';
      c.fillText('NO PARSING', 0, 10); c.restore();
    }
    riseText(c, 'one call, three typed answers', 940, 920, at(t, typedW + 0.3, 0.4), F.archivo(87, 500), 32, rgba('graphite'));
    return {};
  }
}
