// The bot: an original character standing in for Claude at work (labelled an illustration on screen). Warm white shell, coral
// accents (Claude's colour, no logo), a dark visor with teal eyes, an antenna. drawBot draws one pose; botOverlay runs V3's bot
// cues (data/aura_v3/cues.json `bot`): it jumps out of the prompt box, carries clips onto the timeline, stomps, presses
// EXPORT, types, waves. Every move is a function of t and the measured beat (eighths, bars).
import { A, type AuraCues } from './common';
import { ease, sat, span, alpha, txt, mono } from './common';

export const BOT = { shell: '#F2EFEA', shade: '#CFC9C0', coral: '#D97757', visor: '#0B0E12', eye: '#7FF0FF' };
export type Pose = { sq?: number; armL?: number; armR?: number; legL?: number; legR?: number; tilt?: number; eyes?: 'open' | 'happy' | 'blink' | 'wide'; hold?: string };

/** One bot at (x, y) (feet), height ~ 120 px at s = 1. Angles in radians (0 = down). */
export function drawBot(c: CanvasRenderingContext2D, x: number, y: number, s: number, p: Pose = {}) {
  const sq = p.sq ?? 1, sy = sq, sx = 1 / Math.sqrt(sq);
  c.save(); c.translate(x, y); c.scale(s * sx, s * sy); c.rotate(p.tilt ?? 0);
  const limb = (x0: number, y0: number, ang: number, len: number, w: number) => {
    c.save(); c.translate(x0, y0); c.rotate(ang); c.strokeStyle = BOT.shade; c.lineWidth = w; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, len); c.stroke(); c.fillStyle = BOT.shell; c.beginPath(); c.arc(0, len, w * 0.62, 0, Math.PI * 2); c.fill(); c.restore();
  };
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 10;
  limb(-11, -30, p.legL ?? 0.05, 28, 10); limb(11, -30, p.legR ?? -0.05, 28, 10);   // legs
  // body
  c.fillStyle = BOT.shell; c.beginPath(); c.roundRect(-20, -70, 40, 44, 14); c.fill();
  c.shadowBlur = 0; c.fillStyle = BOT.coral; c.beginPath(); c.arc(0, -50, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = alpha(BOT.coral, 0.35); c.beginPath(); c.arc(0, -50, 10, 0, Math.PI * 2); c.fill();
  limb(-22, -64, p.armL ?? 0.25, 26, 9); limb(22, -64, p.armR ?? -0.25, 26, 9);   // arms
  if (p.hold) {   // something held overhead: a clip
    c.fillStyle = p.hold; c.beginPath(); c.roundRect(-34, -138, 68, 26, 6); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.5; c.stroke();
  }
  // head
  c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 10;
  c.fillStyle = BOT.shell; c.beginPath(); c.roundRect(-26, -112, 52, 42, 16); c.fill(); c.shadowBlur = 0;
  c.fillStyle = BOT.visor; c.beginPath(); c.roundRect(-20, -105, 40, 26, 10); c.fill();
  const e = p.eyes ?? 'open';
  c.fillStyle = BOT.eye; c.shadowColor = BOT.eye; c.shadowBlur = 8;
  for (const ex of [-9, 9]) {
    c.beginPath();
    if (e === 'happy') { c.lineWidth = 3; c.strokeStyle = BOT.eye; c.arc(ex, -90, 5, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
    else if (e === 'blink') c.fillRect(ex - 5, -92, 10, 2.5);
    else { const h = e === 'wide' ? 12 : 9; c.roundRect(ex - 3.5, -92 - h / 2, 7, h, 3.5); c.fill(); }
  }
  c.shadowBlur = 0;
  c.strokeStyle = BOT.shade; c.lineWidth = 3; c.beginPath(); c.moveTo(0, -112); c.lineTo(0, -124); c.stroke();
  c.fillStyle = BOT.coral; c.beginPath(); c.arc(0, -127, 5, 0, Math.PI * 2); c.fill();
  c.restore();
}

export type BotCue = [string, number, number, Record<string, any>];   // [kind, t0, t1, params]

/** A jump from a to b (feet), height h, landing at t1: squash at take-off and landing, stretch in the air. */
function hop(t: number, t0: number, t1: number, a: [number, number], b: [number, number], h: number) {
  const k = sat((t - t0) / (t1 - t0)), e = ease.inOut(k, 2);
  const x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e - h * 4 * k * (1 - k);
  const sq = k < 0.08 ? 1 - 0.3 * Math.sin((k / 0.08) * Math.PI) : k > 0.92 ? 1 - 0.3 * Math.sin(((k - 0.92) / 0.08) * Math.PI) : 1 + 0.12 * Math.sin(k * Math.PI);
  return { x, y, sq, air: k > 0.08 && k < 0.92 };
}

/** Run the bot cues at t (the 2D overlay, above every world). */
export function botOverlay(c: CanvasRenderingContext2D, t: number, cues: BotCue[], cuesMeta: { eighth: number; beat: number }) {
  const e8 = cuesMeta.eighth, beat = cuesMeta.beat;
  for (const [kind, t0, t1, p] of cues) {
    if (t < t0 || t >= t1) continue;
    const lt = t - t0, bob = Math.sin((t / beat) * Math.PI * 2) * 3;
    if (kind === 'popout') {   // out of the prompt box, up, then a leap at the camera (the 3D bot lands on the drop)
      const a: [number, number] = p.from, mid: [number, number] = p.mid, k2 = span(t, t1 - e8, t1);
      if (k2 <= 0) { const h = hop(t, t0, t1 - e8, a, mid, 220); drawBot(c, h.x, h.y, 1.1, { sq: h.sq, armL: h.air ? 2.6 : 0.4, armR: h.air ? -2.6 : -0.4, legL: h.air ? 0.4 : 0, legR: h.air ? -0.4 : 0, eyes: 'wide' }); }
      else drawBot(c, mid[0], mid[1] + 200 * k2, 1.1 + 6 * ease.in(k2, 2.5), { armL: 2.8, armR: -2.8, eyes: 'happy', sq: 1.1 });
      if (lt < 0.2) txt(c, 'CLAUDE · AT WORK (illustration)', a[0], a[1] + 30, mono(10, 700), alpha(A.text, 0.7 * (1 - lt / 0.2)), 1.5, 'center');
    } else if (kind === 'carry') {   // carry each clip down onto its slot, then the play stomp, then the dive into the monitor
      const drops: [number, number, number, string][] = p.drops;   // [t, x, y, colour]
      let done = false;
      for (let i = 0; i < drops.length; i++) {
        const [td, xx, yy, col] = drops[i]!, ts = td - 0.42;
        if (t >= ts && t < td) { const k = ease.inOut(span(t, ts, td), 2); drawBot(c, xx + (1 - k) * 60, yy - 40 - (1 - k) * 160, 0.62, { hold: col, armL: 2.9, armR: -2.9, legL: 0.3 * Math.sin(t * 30), legR: -0.3 * Math.sin(t * 30), eyes: 'wide' }); done = true; }
        else if (t >= td && t < (drops[i + 1]?.[0] ?? p.play) - 0.42) { const k = span(t, td, td + 0.12); drawBot(c, xx + 26, yy - 40, 0.62, { sq: 1 - 0.25 * Math.sin(k * Math.PI), eyes: 'happy', armL: 0.6, armR: -2.4 }); done = true; }
      }
      if (!done && t >= p.play - 0.42 && t < p.morph) {
        const h = hop(t, p.play - 0.42, p.play, [drops[drops.length - 1]![1] + 26, drops[drops.length - 1]![2] - 40], p.playAt, 120);
        drawBot(c, h.x, h.y, 0.62, { sq: t >= p.play ? 1 - 0.3 * Math.exp(-(t - p.play) / 0.06) : h.sq, armL: 2.4, armR: -2.4, eyes: t >= p.play ? 'happy' : 'wide' });
      } else if (!done && t >= p.morph) {
        const k = span(t, p.morph, t1); drawBot(c, p.playAt[0], p.playAt[1] + 120 * ease.in(k, 2), 0.62 * (1 + 2 * k), { armL: 2.9, armR: -2.9, eyes: 'wide' });
      }
    } else if (kind === 'finale') {   // walks on, inspects, nudges the clip onto the bar, stomps LOCK, jumps on EXPORT
      const P: Record<string, [number, number]> = p.at, T: Record<string, number> = p.ev;
      if (t < T.nudge! - 0.4) { const k = ease.out(span(t, t0, t0 + 0.6), 3); const x0 = 640, [xi, yi] = P.idle!; drawBot(c, x0 + (xi - x0) * k, yi + bob * (k > 0.99 ? 1 : 0), 0.7, { legL: k < 1 ? 0.4 * Math.sin(t * 24) : 0, legR: k < 1 ? -0.4 * Math.sin(t * 24) : 0, armR: t > T.macro! ? -1.6 : -0.3, eyes: t > T.macro! && t < T.dawn! ? 'wide' : 'open' }); }
      else if (t < T.click!) { const h = hop(t, T.nudge! - 0.4, T.nudge!, P.idle!, P.nudge!, 60); const push = span(t, T.nudge!, T.nudge! + 2 * e8); drawBot(c, h.x - 14 * push, h.y, 0.7, { sq: h.sq, armL: t >= T.nudge! ? 1.5 : 0.3, armR: t >= T.nudge! ? 1.3 : -0.3, tilt: t >= T.nudge! ? -0.25 : 0, eyes: 'wide' }); }
      else if (t < T.export! - 0.3) { const k = span(t, T.click!, T.click! + 0.15); drawBot(c, P.nudge![0], P.nudge![1] - 50 * Math.sin(Math.min(1, k) * Math.PI) * (k < 1 ? 1 : 0), 0.7, { sq: k >= 1 ? 1 - 0.3 * Math.exp(-(t - T.click! - 0.15) / 0.05) : 1.1, eyes: 'happy', armL: 2.6, armR: -2.6 }); }
      else if (t < T.flash!) { const h = hop(t, T.export! - 0.3, T.export!, P.nudge!, P.export!, 160); drawBot(c, h.x, h.y, 0.62, { sq: t >= T.export! ? 1 - 0.32 * Math.exp(-(t - T.export!) / 0.06) : h.sq, armL: 2.5, armR: -2.5, eyes: t >= T.export! ? 'happy' : 'wide' }); }
      else if (t >= T.line!) drawBot(c, P.line![0], P.line![1] + bob, 0.8, { eyes: 'happy', armR: -2.6 + 0.5 * Math.sin(t * 14) });
    } else if (kind === 'type') {   // sits on the prompt box's edge, tapping on each eighth
      const tap = (Math.floor(lt / e8) % 2) * 0.5; drawBot(c, p.x, p.y, 0.55, { armL: 0.9 + tap, armR: -0.9 - (0.5 - tap), legL: 1.4, legR: -1.4, eyes: 'open' });
    } else if (kind === 'wave') {   // the outro: waves on the beat beside the end card, then bows
      const bow = t > p.bow ? ease.inOut(span(t, p.bow, p.bow + 0.4), 2) : 0;
      drawBot(c, p.x, p.y + bob * (1 - bow), 0.9, { armR: -2.6 + 0.55 * Math.sin((t / beat) * Math.PI * 2), armL: 0.3, tilt: 0.35 * bow, eyes: bow > 0.5 ? 'happy' : 'open' });
    }
  }
}
export type { AuraCues };
