// V2 (89 s) intro (0-10.105 s, Dhurandhar): real stock footage of one programmer (Mixkit's 416xx series, the Mixkit Stock Video
// Free License, analysis/aura_v2_stock.py -> data/aura_v2/stock.json), cut on the intro's measured words and hits. Each shot has
// a speed ramp and a zoom punch; every cut is a whip (a horizontal smear out of one shot and into the next); the last shot is a
// radial zoom blur into his screen onto Dubplate's slam. The text layer is the shared intro overlay (intro_v2.ts).
import { CX, FXW, FXH, type AuraCtx, type World, ease, sat, span } from './common';
import { drawIntroOverlay } from './intro_v2';

type Shot = { seq: string; ct: number; z: number; fy: number; dx: number; t0: number; t1: number };

export function introStockWorld(): World {
  let x!: AuraCtx; let H: number[] = [], W: Record<string, number> = {}, slam = 0, e8 = 0;
  const shot = (t: number): Shot => {
    const [h1, h2, h3, h4, h5] = H as [number, number, number, number, number], you = W.you!;
    const punch = (a: number) => 0.12 * (1 - ease.out(span(t, a, a + 0.3), 3));
    if (t < you) return { seq: 'stk_face1', ct: 0.2 + t * 0.85, z: 1.06 + 0.1 * ease.inOut(t / you, 2), fy: 440, dx: 0, t0: 0, t1: you };
    if (t < h1) return { seq: 'stk_face2', ct: 0.1 + (t - you) * 0.95, z: 1.12 - 0.06 * ease.out((t - you) / (h1 - you), 2) + punch(you), fy: 420, dx: 0, t0: you, t1: h1 };
    if (t < h2) return { seq: 'stk_hands', ct: 0.1 + (t - h1), z: 1.04 + punch(h1), fy: 600, dx: 0, t0: h1, t1: h2 };
    if (t < h3) { const k = (t - h2) / (h3 - h2); return { seq: 'stk_code', ct: 0.1 + (t - h2) * (0.8 + 0.4 * k), z: 1.02 + 0.08 * k + punch(h2), fy: 540, dx: 16 - 32 * k, t0: h2, t1: h3 }; }
    if (t < h4) return { seq: 'stk_ots', ct: 0.1 + (t - h3), z: 1.05 + punch(h3), fy: 500, dx: 0, t0: h3, t1: h4 };
    if (t < h5) return { seq: 'stk_mon', ct: 0.1 + (t - h4) * 0.9, z: 1.02 + 0.05 * (t - h4) + punch(h4), fy: 480, dx: 0, t0: h4, t1: h5 };
    const k = ease.in(sat((t - h5) / (slam - h5)), 2);
    return { seq: 'stk_dive', ct: 0.1 + (t - h5), z: 1 + 1.6 * k, fy: 520, dx: 0, t0: h5, t1: slam };
  };
  const draw1 = (c: CanvasRenderingContext2D, s: Shot, dx = 0, a = 1) => {
    const f = x.frame(s.seq, s.ct); if (!f) return;
    c.save(); c.globalAlpha = a; c.translate(CX + s.dx + dx, s.fy); c.scale(s.z, s.z); c.translate(-CX, -s.fy); c.drawImage(f, 0, 0, FXW, FXH); c.restore();
  };
  return {
    init(ctx) {
      x = ctx; e8 = x.cues.eighth; slam = x.ev('dh.slam'); H = [1, 2, 3, 4, 5].map((i) => x.ev(`dh.hit${i}`));
      for (const k of ['ladies', 'and', 'gentlemen', 'you', 'are', 'not', 'ready', 'for', 'this']) W[k] = x.ev(`dh.${k}`);
    },
    draw(c, t) {
      const s = shot(t);
      c.fillStyle = '#04060A'; c.fillRect(0, 0, FXW, FXH);
      // the whip: 0.12 s into each shot the frame smears in from the side; 0.08 s before its end it smears out
      const into = t - s.t0, out = s.t1 - t, whipIn = s.t0 > 0 && into < 0.12 ? 1 - into / 0.12 : 0, whipOut = s.t1 < slam && out < 0.08 ? 1 - out / 0.08 : 0;
      const wk = Math.max(whipIn, whipOut), dir = whipIn > 0 ? -1 : 1;
      if (wk > 0.02) {
        draw1(c, s, dir * 90 * wk);
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 1; i <= 5; i++) draw1(c, s, dir * 90 * wk + dir * i * 26 * wk, 0.16 * wk);
        c.restore();
      } else draw1(c, s);
      if (s.seq === 'stk_dive') {   // a radial zoom blur into the screen
        const k = ease.in(sat((t - s.t0) / (slam - s.t0)), 2);
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 1; i <= 5; i++) { const f = x.frame(s.seq, s.ct); if (!f) break; const z = s.z * (1 + 0.05 * i * k); c.globalAlpha = 0.14 * k; c.save(); c.translate(CX, s.fy); c.scale(z, z); c.translate(-CX, -s.fy); c.drawImage(f, 0, 0, FXW, FXH); c.restore(); }
        c.restore();
      }
      if ((import.meta as any).env?.VITE_AURA_COVER) return;   // a clean frame for the cover (analysis/aura_cover_v2.py)
      drawIntroOverlay(c, t, H, W, slam, e8, 'STOCK FOOTAGE · MIXKIT');
    },
  };
}
