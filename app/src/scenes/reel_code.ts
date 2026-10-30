// reel code (9:16, Hindi): "एक support ticket दिया। / Stripe तीन दिन से fail हो रहा है। / तीन सवाल, एक ही call। /
// Team, technical, 0.85। / Urgent, 1.0। / सब typed, कोई parsing नहीं।"
import type { Frame } from '../engine/scene';
import { ReelPlate, wordIn, lineOf, at, typed, drawMixed, F, font, rgba, ease, clamp, COL } from './_vo';

const X = 34, TW = COL.w - 68;
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

export default class ReelCode extends ReelPlate {
  draw(c: CanvasRenderingContext2D, f: Frame) {
    const ly = this.ctx.lyrics, t = f.t;
    const ticket = wordIn(ly, 'support ticket', 'ticket').start;
    const stripe = lineOf(ly, 'Stripe');
    const call = lineOf(ly, 'call');
    const team = wordIn(ly, 'Team, technical', 'technical').start;
    const p85 = wordIn(ly, 'Team, technical', '0.85');
    const urgent = wordIn(ly, 'Urgent', '1.0').start;
    const typedW = wordIn(ly, 'parsing', 1).start;

    // ticket card: big first, then it shrinks to the top while the call is typed
    const k = at(t, ticket - 0.1, 0.45);
    if (k > 0) {
      const shrink = at(t, call.start - 0.15, 0.5, ease.inOutCubic);
      const s = 1 - 0.58 * shrink;
      c.save();
      c.globalAlpha = k * (1 - 0.35 * shrink);
      c.translate(COL.cx, 150 + (1 - k) * 24); c.scale(s, s); c.translate(-COL.cx, 0);
      c.fillStyle = rgba('ink2'); c.fillRect(X, 0, TW, 270);
      c.strokeStyle = rgba('graphite'); c.lineWidth = 2; c.strokeRect(X, 0, TW, 270);
      typed(c, 'support ticket #4821', X + 22, 40, 1, 22, rgba('ash'));
      const msg = ['“I’ve been trying to connect my', 'Stripe account for 3 days and the', 'integration keeps failing. I’m', 'losing sales. Please help ASAP.”'];
      c.font = font(F.serif(400, true), 30);
      msg.forEach((m, i) => { c.fillStyle = rgba('bone', 0.92); c.fillText(m, X + 22, 100 + i * 40); });
      // highlight the trouble while it is spoken
      const h = at(t, stripe.start, Math.max(0.3, stripe.end - stripe.start), ease.inOutCubic);
      c.fillStyle = rgba('signal', 0.28);
      c.fillRect(X + 16, 100 + 40 - 29, 470 * h, 38);
      c.restore();
    }

    // the call, typed while 'तीन सवाल, एक ही call' is spoken
    const tp = clamp((t - call.start + 0.1) / Math.max(0.6, call.end - call.start + 0.2));
    if (tp > 0) {
      const total = CODE.reduce((n, [, s]) => n + s.length, 0);
      let shown = Math.floor(tp * total), x = X + 14, y = 312;
      c.font = font(F.mono(500), 22);
      for (const [kind, s] of CODE) {
        if (kind === 'nl') { x = X + 14; y += 30; continue; }
        if (shown <= 0) break;
        const part = s.slice(0, shown); shown -= s.length;
        c.fillStyle = kind === 'kw' ? rgba('ash') : kind === 'fn' ? rgba('signal') : rgba('bone');
        c.fillText(part, x, y);
        x += c.measureText(part).width;
      }
      if (tp < 1 && Math.floor(t * 4) % 2 === 0) { c.fillStyle = rgba('signal'); c.fillRect(x + 3, y - 20, 11, 24); }
    }

    // the answers come back typed
    const r1 = at(t, team - 0.05, 0.35);
    if (r1 > 0) {
      c.save();
      c.globalAlpha = r1;
      c.font = font(F.mono(600), 28); c.fillStyle = rgba('bone');
      c.fillText('team   → "technical"', X + 14, 596);
      // probability bar counts up while '0.85' is spoken
      const v = 0.85 * at(t, p85.start - 0.05, Math.max(0.4, p85.end - p85.start), ease.outCubic);
      c.fillStyle = rgba('graphite', 0.6); c.fillRect(X + 14, 612, 380, 10);
      c.fillStyle = rgba('signal'); c.fillRect(X + 14, 612, 380 * v, 10);
      c.font = font(F.mono(500), 24); c.fillStyle = rgba('signal');
      c.fillText(v.toFixed(2), X + 410, 624);
      c.restore();
    }
    const r2 = at(t, urgent - 0.05, 0.3);
    if (r2 > 0) {
      c.save();
      c.globalAlpha = r2; c.font = font(F.mono(600), 28); c.fillStyle = rgba('bone');
      c.fillText('urgent → 1.0', X + 14, 662);
      c.restore();
    }
    // stamp
    const s = at(t, typedW - 0.05, 0.25, ease.outBack);
    if (s > 0) {
      c.save(); c.translate(COL.cx, 440); c.rotate(-0.08); c.scale(1.4 - 0.4 * s, 1.4 - 0.4 * s); c.globalAlpha = clamp(s * 1.5);
      c.fillStyle = rgba('ink', 0.78); c.fillRect(-200, -52, 400, 94);
      c.strokeStyle = rgba('signal'); c.lineWidth = 5; c.strokeRect(-200, -52, 400, 94);
      drawMixed(c, 'NO PARSING', 0, 20, 52, 900, rgba('signal'), 'center');
      c.restore();
    }
    return {};
  }
}
