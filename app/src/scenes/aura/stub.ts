// A placeholder world for building the reel's structure: its name, the segment params, the bar and eighth counters, so the
// whole 90 s can be checked against the beat before each world is built.
import { A, CX, FXW, FXH, type AuraCtx, type World, label, title, fillRR } from './common';

export function stubWorld(name: string): World {
  let x!: AuraCtx;
  return {
    init(ctx) { x = ctx; },
    draw(c, t, p) {
      c.fillStyle = A.char; c.fillRect(0, 0, FXW, FXH);
      const bar = Math.floor(t / x.cues.bar + 1e-6), e = Math.floor((t - bar * x.cues.bar) / x.cues.eighth + 1e-6);
      title(c, name.toUpperCase(), CX, 470, 64, A.teal);
      label(c, JSON.stringify(p), CX, 520, 14, A.dim, 'center', 0);
      label(c, `t ${t.toFixed(2)} · bar ${bar} · eighth ${e}`, CX, 560, 16, A.text, 'center');
      for (let k = 0; k < 8; k++) fillRR(c, CX - 150 + k * 38, 600, 30, 30, 6, k === e ? A.amber : A.panel2);
    },
  };
}
