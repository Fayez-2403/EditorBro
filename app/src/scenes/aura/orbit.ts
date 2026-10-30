// 01 The cinematic intro (0-10.105 s) on the Dhurandhar title track: "Ladies and gentlemen, you are not ready for this."
// Only the first 10 s of the user's placeholder backshot (an AI clip, labelled), re-cut on the intro's measured hits
// (data/aura/intro.json -> cues dh.*): the line word by word over the eye macro; hit 1 "6 RENDERS.", hit 2 "ALL CODE." on the
// desk; hit 3 CREATOR MODE, hit 4 it flips ON over the shoulder with the timeline in the window; hit 5 the dive into the screen,
// landing on Dubplate's phrase-line slam at 10.105 s, where the IDE opens.
import { A, CX, FXW, FXH, type AuraCtx, type World, ease, pulse, mono, txt, ax, alpha, fillRR, sat, span } from './common';
import { spring } from '../_vo';
import { hash } from '../../engine/util';

export function orbitWorld(): World {
  let x!: AuraCtx; let H: number[] = [], W: Record<string, number> = {}, slam = 0, e8 = 0;
  /** The backshot at clip time ct (never past 9.75 s: only the clip's first 10 s are used), zoomed z about (fx, fy). */
  const shot = (c: CanvasRenderingContext2D, ct: number, z: number, fx: number, fy: number, dx = 0) => {
    const f = x.frame('ph', Math.min(9.75, ct)); c.fillStyle = '#05070A'; c.fillRect(0, 0, FXW, FXH); if (!f) return;
    c.save(); c.translate(fx + dx, fy); c.scale(z, z); c.translate(-fx, -fy); c.drawImage(f, 0, 0, FXW, FXH); c.restore();
  };
  const trails = (c: CanvasRenderingContext2D, t: number, t0: number, k: number) => {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const tb = t0 + hash(i, 1) * 1.6, age = t - tb; if (age < 0 || age > 0.7) continue;
      const y = 170 + hash(i, 2) * 640, len = 160 + hash(i, 3) * 360, xx = -len + (FXW + 2 * len) * ease.out(age / 0.7, 1.6);
      const col = hash(i, 4) < 0.65 ? '63,214,224' : '255,181,71', g = c.createLinearGradient(xx - len, 0, xx, 0);
      g.addColorStop(0, `rgba(${col},0)`); g.addColorStop(1, `rgba(${col},${0.55 * k * (1 - age / 0.7)})`);
      c.fillStyle = g; c.fillRect(xx - len, y, len, 1.5 + hash(i, 5) * 2.5);
    }
    c.restore();
  };
  /** One word of the line: it springs in at its measured time. */
  const word = (c: CanvasRenderingContext2D, t: number, s: string, t0: number, xx: number, y: number, size: number, col: string) => {
    if (t < t0) return 0;
    const k = spring(t - t0, 0.22, 0.55); c.font = ax(size, 118, 900); const w = c.measureText(s).width;
    c.save(); c.translate(xx + w / 2, y); c.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); c.globalAlpha = sat((t - t0) / 0.06);
    txt(c, s, 0, 0, ax(size, 118, 900), col, 1, 'center'); c.restore(); return w;
  };
  const line = (c: CanvasRenderingContext2D, t: number, ws: [string, number, string?][], y: number, size: number) => {
    c.font = ax(size, 118, 900); const gap = size * 0.28, total = ws.reduce((a, [s]) => a + c.measureText(s).width, 0) + gap * (ws.length - 1);
    let xx = CX - total / 2; for (const [s, t0, col] of ws) { c.font = ax(size, 118, 900); const w = c.measureText(s).width; word(c, t, s, t0, xx, y, size, col ?? A.text); xx += w + gap; }
  };
  return {
    init(ctx) {
      x = ctx; e8 = x.cues.eighth; slam = x.ev('dh.slam');
      H = [1, 2, 3, 4, 5].map((i) => x.ev(`dh.hit${i}`));
      for (const k of ['ladies', 'and', 'gentlemen', 'you', 'are', 'not', 'ready', 'for', 'this']) W[k] = x.ev(`dh.${k}`);
    },
    draw(c, t) {
      const [h1, h2, h3, h4, h5] = H as [number, number, number, number, number];
      if (t < h1) {   // the eye macro, and the line word by word
        shot(c, t * 0.47, 1.1 + 0.2 * ease.inOut(t / h1, 2), CX, 470);
        const g = c.createLinearGradient(0, 110, 0, 470); g.addColorStop(0, 'rgba(3,4,6,0.78)'); g.addColorStop(1, 'rgba(3,4,6,0)'); c.fillStyle = g; c.fillRect(0, 0, FXW, 480);
        if (t < W.ladies! + 0.1) txt(c, 'OPUS 5.5 · THE EDITOR’S AURA', CX, 150, mono(12, 700), alpha(A.text, 0.8), 3, 'center');
        if (t < W.you!) { line(c, t, [['LADIES', W.ladies!], ['AND', W.and!]], 230, 60); line(c, t, [['GENTLEMEN,', W.gentlemen!]], 300, 60); }
        else {
          line(c, t, [['YOU', W.you!], ['ARE', W.are!]], 220, 58);
          line(c, t, [['NOT', W.not!], ['READY', W.ready!, A.teal]], 292, 58);
          line(c, t, [['FOR', W.for!], ['THIS.', W.this!]], 364, 58);
        }
        // the timeline caught in the glasses: a thin bar of clips sliding across the lens
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.32;
        for (let i = 0; i < 7; i++) { const xx = 120 + ((i * 70 + t * 90) % 420); fillRR(c, xx, 520, 52, 7, 2, ['#3FD6E0', '#9B7BFF', '#FFB547', '#C8F31D'][i % 4]!); }
        c.fillStyle = '#FFB547'; c.fillRect(120 + ((t * 160) % 420), 510, 1.5, 26); c.restore();
      } else if (t < h3) {   // the desk: hit 1 "6 RENDERS.", hit 2 "ALL CODE."
        if (t < h2) shot(c, 2.0 + (t - h1) * 1.0, 1.08, CX, 420);
        else { shot(c, 2.6 + (t - h2) * 1.0, 1.04 - 0.03 * ((t - h2) / (h3 - h2)), CX, 540, 20 - 40 * ((t - h2) / (h3 - h2))); trails(c, t, h2, 0.8); }
        const g = c.createLinearGradient(0, 110, 0, 430); g.addColorStop(0, 'rgba(3,4,6,0.7)'); g.addColorStop(1, 'rgba(3,4,6,0)'); c.fillStyle = g; c.fillRect(0, 0, FXW, 440);
        const k1 = spring(t - h1, 0.25, 0.5);
        c.save(); c.translate(CX, 236); c.scale(1.3 - 0.3 * k1, 1.3 - 0.3 * k1); txt(c, '6 RENDERS.', 0, 0, ax(66, 118, 900), A.text, 1, 'center'); c.restore();
        if (t >= h2) {
          const k2 = spring(t - h2, 0.25, 0.5);
          c.save(); c.translate(CX, 318); c.scale(0.7 + 0.3 * k2, 0.7 + 0.3 * k2); txt(c, 'ALL CODE.', 0, 0, ax(66, 118, 900), A.teal, 1, 'center'); c.restore();
          txt(c, 'BUILT IN VS CODE WITH CLAUDE OPUS 5.5', CX, 362, mono(13, 700), alpha(A.text, 0.85 * sat((t - h2) / 0.2)), 2.5, 'center');
        }
        c.fillStyle = `rgba(255,255,255,${0.3 * Math.max(pulse(t, h1, 0.06), pulse(t, h2, 0.06))})`; c.fillRect(0, 0, FXW, FXH);
      } else if (t < h5) {   // over the shoulder: CREATOR MODE (hit 3), ON (hit 4), the timeline in the window
        if (t < h4) shot(c, 5.0 + (t - h3) * 1.0, 1.04, CX, 480);
        else shot(c, 6.2 + (t - h4) * 1.15, 1.0 + 0.04 * (t - h4), CX, 420);
        trails(c, t, h3, 1);
        if (t >= h4) {
          const lt = t - h4;
          c.save(); c.globalAlpha = 0.28; c.globalCompositeOperation = 'lighter'; c.setTransform(c.getTransform().multiply(new DOMMatrix([1, -0.08, 0.25, 1, -40, 30])));
          for (let tr = 0; tr < 4; tr++) for (let k = 0; k < 6; k++) { const w = 40 + 60 * hash(tr, k), xx = 60 + k * 86 + hash(tr, k, 2) * 20 - lt * 40; fillRR(c, xx, 160 + tr * 18, w, 12, 3, ['#3FD6E0', '#9B7BFF', '#FFB547', '#C8F31D'][tr]!); }
          c.fillStyle = '#FFB547'; c.fillRect(300, 150, 2, 84); c.restore();
        }
        const on = t >= h4, k = spring(t - h3, 0.3, 0.6), kk = ease.out(span(t, h4, h4 + 0.12), 3);
        c.save(); c.translate(CX, 236); c.scale(k, k);
        fillRR(c, -206, -34, 412, 68, 34, 'rgba(5,8,12,0.72)'); c.strokeStyle = alpha(on ? A.teal : '#FFFFFF', on ? 0.9 : 0.2); c.lineWidth = 1.5; c.beginPath(); c.roundRect(-206, -34, 412, 68, 34); c.stroke();
        txt(c, 'CREATOR MODE', -180, 7, ax(20, 120, 900), A.text, 2, 'left');
        fillRR(c, 100, -18, 84, 36, 18, on ? A.teal : '#2A3340'); c.beginPath(); c.arc(118 + 48 * kk, 0, 14, 0, Math.PI * 2); c.fillStyle = '#FFFFFF'; c.fill();
        txt(c, on ? 'ON' : 'OFF', on ? 130 : 160, 6, mono(11, 800), on ? '#04191C' : A.dim, 1, 'center');
        c.restore();
        if (on) { c.fillStyle = alpha(A.teal, 0.25 * pulse(t, h4, 0.08)); c.fillRect(0, 0, FXW, FXH); }
      } else {   // the dive into the screen, onto Dubplate's slam
        const lt = t - h5, k = ease.in(sat(lt / (slam - h5)), 2);
        shot(c, 8.6 + lt * 1.6, 1 + 1.6 * k, 304, 430);
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 40; i++) {   // warp streaks out of the screen centre
          const a = hash(i, 7) * Math.PI * 2, r0 = 60 + hash(i, 8) * 200 + k * 500, len = 40 + 220 * k;
          c.strokeStyle = `rgba(127,240,255,${0.35 * k})`; c.lineWidth = 1.2; c.beginPath(); c.moveTo(304 + Math.cos(a) * r0, 430 + Math.sin(a) * r0); c.lineTo(304 + Math.cos(a) * (r0 + len), 430 + Math.sin(a) * (r0 + len)); c.stroke();
        }
        c.restore();
        const fl = span(t, slam - e8, slam); if (fl > 0) { c.fillStyle = `rgba(232,250,252,${ease.in(fl, 2)})`; c.fillRect(0, 0, FXW, FXH); }
      }
      txt(c, 'BACKSHOT · AI PLACEHOLDER', FXW - 18, 1052, mono(9, 600), alpha(A.text, 0.45), 1.2, 'right');
    },
  };
}
