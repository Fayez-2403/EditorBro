// V3 intro (0-5.3 s, the Dhurandhar line, cut down): only the side shot of the developer (the user's frame; no face reveal),
// the backshot's frames 148-150 held. He cracks his neck (the head region bends toward his shoulder in a feathered shear
// warp, then snaps back with an overshoot) on "gentlemen" and on "ready", then his knuckles (a push-in on his hands, a punch
// and a CRACK burst) on the intro's two measured hits; CREATOR MODE (OFF from the first frame, as the user's screenshot) flips
// ON on Dubplate's slam. The line stays on screen above it.
import { A, CX, FXW, FXH, type AuraCtx, type World, ease, mono, txt, ax, alpha, fillRR, sat, span } from './common';
import { spring } from '../_vo';

const HEAD = { x: 228, y: 365, pivot: 490, x0: 60, x1: 400, y0: 230 };   // in the backshot's frame (608x1080)
const HANDS: [number, number][] = [[440, 690], [565, 742]];

export function introV3World(slam: number): World {
  let x!: AuraCtx; let W: Record<string, number> = {}, h1 = 0, h2 = 0;
  const oc = new OffscreenCanvas(FXW, FXH), og = oc.getContext('2d')!;
  /** The neck: a tilt (radians) that ramps toward each crack and snaps back past zero on it. */
  const tilt = (t: number) => {
    const one = (a: number, snap: number, ang: number) => t < a ? 0 : t < snap ? ang * ease.inOut(span(t, a, snap - 0.03), 2) : -0.25 * ang * Math.exp(-(t - snap) / 0.07) * Math.cos((t - snap) * 40);
    return one(0.8, W.gentlemen!, -0.11) + one(2.62, W.ready!, 0.11);
  };
  /** The camera: a slow push, then into the hands for the knuckles, back out for the slam. */
  const cam = (t: number) => {
    const into = ease.in(span(t, 3.75, h1), 2), punch2 = ease.out(span(t, h2, h2 + 0.08), 3), out = ease.inOut(span(t, h2 + 0.14, slam - 0.05), 3);
    const z = (1.0 + 0.04 * (t / slam)) + (0.72 * into + 0.28 * punch2) * (1 - out);
    const fx = 304 + (480 - 304) * into * (1 - out), fy = 520 + (715 - 520) * into * (1 - out);
    return { z, fx, fy };
  };
  return {
    init(ctx) {
      x = ctx; h1 = x.ev('dh.hit1'); h2 = x.ev('dh.hit2');
      for (const k of ['ladies', 'and', 'gentlemen', 'you', 'are', 'not', 'ready', 'for', 'this']) W[k] = x.ev(`dh.${k}`);
    },
    draw(c, t) {
      const f = x.frame('ph', 4.95 + t * 0.06), v = cam(t), th = tilt(t);
      c.fillStyle = '#04060A'; c.fillRect(0, 0, FXW, FXH);
      c.save(); c.translate(v.fx, v.fy); c.scale(v.z, v.z); c.translate(-v.fx, -v.fy);
      if (f) {
        c.drawImage(f, 0, 0, FXW, FXH);
        if (Math.abs(th) > 0.002) {   // the head bends: strips sheared about the neck, feathered into the frame
          og.clearRect(0, 0, FXW, FXH); og.globalCompositeOperation = 'source-over';
          for (let y = HEAD.y0; y < HEAD.pivot; y += 4) { const dx = Math.tan(th) * (HEAD.pivot - y); og.drawImage(f, HEAD.x0, y, HEAD.x1 - HEAD.x0, 4, HEAD.x0 + dx, y, HEAD.x1 - HEAD.x0, 4); }
          og.globalCompositeOperation = 'destination-in';
          const g = og.createRadialGradient(HEAD.x, HEAD.y + 20, 90, HEAD.x, HEAD.y + 20, 165); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          og.fillStyle = g; og.fillRect(0, 0, FXW, FXH); og.globalCompositeOperation = 'source-over';
          c.drawImage(oc, 0, 0);
        }
      }
      // the snaps: a burst of short lines at the neck, then at the knuckles
      const burst = (cx: number, cy: number, t0: number, r0: number) => {
        const a = t - t0; if (a < 0 || a > 0.22) return; const k = a / 0.22;
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,236,220,${0.9 * (1 - k)})`; c.lineWidth = 3;
        for (let i = 0; i < 8; i++) { const an = (i / 8) * Math.PI * 2 + 0.3; c.beginPath(); c.moveTo(cx + Math.cos(an) * (r0 + 30 * k), cy + Math.sin(an) * (r0 + 30 * k)); c.lineTo(cx + Math.cos(an) * (r0 + 14 + 46 * k), cy + Math.sin(an) * (r0 + 14 + 46 * k)); c.stroke(); }
        c.restore();
      };
      burst(250, 478, W.gentlemen!, 18); burst(250, 478, W.ready!, 18);
      for (const [hx, hy] of HANDS) { burst(hx, hy, h1, 14); burst(hx, hy, h2, 14); }
      c.restore();
      // CRACK on the knuckles
      for (const [t0, s, xx, yy, rot] of [[h1, 'CRACK', 360, 620, -0.14], [h2, 'CRACK!', 430, 690, 0.1]] as [number, string, number, number, number][]) {
        const a = t - t0; if (a < 0 || a > 0.42) continue; const k = spring(a, 0.16, 0.45);
        c.save(); c.translate(xx, yy); c.rotate(rot); c.scale(0.5 + 0.5 * k, 0.5 + 0.5 * k); c.globalAlpha = 1 - sat((a - 0.3) / 0.12);
        c.font = ax(58, 125, 900); c.lineWidth = 8; c.strokeStyle = '#04060A'; c.lineJoin = 'round'; c.textAlign = 'center'; c.strokeText(s, 0, 0); c.fillStyle = '#D97757'; c.fillText(s, 0, 0); c.restore();
      }
      // the line (each phrase kept on screen), the CREATOR MODE pill
      const g = c.createLinearGradient(0, 90, 0, 380); g.addColorStop(0, 'rgba(3,4,6,0.75)'); g.addColorStop(1, 'rgba(3,4,6,0)'); c.fillStyle = g; c.fillRect(0, 0, FXW, 380);
      const word = (s: string, t0: number, xx: number, y: number, size: number, col: string) => {
        if (t < t0) return; const k = spring(t - t0, 0.22, 0.55); c.font = ax(size, 118, 900); const w = c.measureText(s).width;
        c.save(); c.translate(xx + w / 2, y); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); c.globalAlpha *= sat((t - t0) / 0.06); txt(c, s, 0, 0, ax(size, 118, 900), col, 1, 'center'); c.restore();
      };
      const line = (ws: [string, number, string?][], y: number, size: number) => {
        c.font = ax(size, 118, 900); const gap = size * 0.28, total = ws.reduce((a_, [s]) => a_ + c.measureText(s).width, 0) + gap * (ws.length - 1);
        let xx = CX - total / 2; for (const [s, t0, col] of ws) { c.font = ax(size, 118, 900); const w = c.measureText(s).width; word(s, t0, xx, y, size, col ?? A.text); xx += w + gap; }
      };
      if (t < W.you!) { line([['LADIES', W.ladies!], ['AND', W.and!]], 168, 48); line([['GENTLEMEN,', W.gentlemen!]], 222, 48); }
      else {
        const up = ease.inOut(span(t, W.you!, W.you! + 0.25), 3);
        c.save(); c.globalAlpha = 1 - 0.4 * up; txt(c, 'LADIES AND GENTLEMEN,', CX, 168 - 34 * up, ax(48 - 24 * up, 118, 900), A.text, 1, 'center'); c.restore();
        line([['YOU', W.you!], ['ARE', W.are!], ['NOT', W.not!]], 176, 46); line([['READY', W.ready!, A.teal], ['FOR', W.for!], ['THIS.', W.this!]], 228, 46);
      }
      const on = t >= slam - 0.2, kk = ease.out(span(t, slam - 0.2, slam - 0.08), 3);   // it begins: ON just before the slam
      c.save(); c.translate(CX, 300);
      fillRR(c, -206, -34, 412, 68, 34, 'rgba(5,8,12,0.72)'); c.strokeStyle = alpha(on ? A.teal : '#FFFFFF', on ? 0.9 : 0.2); c.lineWidth = 1.5; c.beginPath(); c.roundRect(-206, -34, 412, 68, 34); c.stroke();
      txt(c, 'CREATOR MODE', -180, 7, ax(20, 120, 900), A.text, 2, 'left');
      fillRR(c, 100, -18, 84, 36, 18, on ? A.teal : '#2A3340'); c.beginPath(); c.arc(118 + 48 * kk, 0, 14, 0, Math.PI * 2); c.fillStyle = '#FFFFFF'; c.fill();
      txt(c, on ? 'ON' : 'OFF', on ? 130 : 160, 6, mono(11, 800), on ? '#04191C' : A.dim, 1, 'center'); c.restore();
      if (on) { c.fillStyle = alpha(A.teal, 0.3 * (1 - kk)); c.fillRect(0, 0, FXW, FXH); }
      txt(c, 'BACKSHOT · AI PLACEHOLDER', FXW - 18, 1052, mono(9, 600), alpha(A.text, 0.45), 1.2, 'right');
    },
  };
}
