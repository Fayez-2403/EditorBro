// Vox template, paper cards: equal torn-edge cards stacked in the safe zone, dropping in one per beat.
// params: { line, title?: string, cards: { head: string, body?: string, hi?: boolean, lines?: number }[], foot?: string }
// (lines: draw that many grey "text" rules in the card, for showing written output)
import type { Frame } from '../engine/scene';
import { VoxPlate, VOX, VOX_BOX, torn, block, blockWidth, voxLabel, pop } from './_vo';

export default class VoxCards extends VoxPlate {
  draw(c: CanvasRenderingContext2D, ts: number, _f: Frame) {
    const p = this.ctx.params, cards: { head: string; body?: string; hi?: boolean; lines?: number }[] = p.cards;
    const n = cards.length, gap = 22;
    const y0 = VOX_BOX.y0 + (p.title ? 92 : 10), y1 = VOX_BOX.y1 - (p.foot ? 46 : 0);
    const h = Math.min(190, (y1 - y0 - gap * (n - 1)) / n);
    const start = (y0 + y1) / 2 - (h * n + gap * (n - 1)) / 2;
    const w = VOX_BOX.x1 - VOX_BOX.x0 - 10;

    if (p.title) {
      const a = pop(ts, this.line.start - 0.1);
      if (a > 0) { c.save(); c.globalAlpha = a; block(c, p.title, VOX_BOX.x0, VOX_BOX.y0 + 62, Math.min(74, Math.floor(74 * w / blockWidth(c, p.title, 74))), VOX.navy); c.restore(); }
    }
    const headSize = Math.min(64, ...cards.map((cd) => Math.floor(64 * (w - 60) / blockWidth(c, cd.head, 64))));
    cards.forEach((cd, i) => {
      const a = pop(ts, this.beat(i, n) - 0.05, 0.17);
      if (a <= 0) return;
      const y = start + i * (h + gap);
      c.save();
      c.translate(0, -(1 - a) * 40); c.globalAlpha *= Math.min(1, a * 2);
      torn(c, VOX_BOX.x0, y, w, h, 101 + i * 13 + p.line, cd.hi ? VOX.yellow : VOX.cream);
      const hy = y + Math.min(h * 0.52, 26 + headSize);
      block(c, cd.head, VOX_BOX.x0 + 28, hy, headSize, cd.hi ? VOX.navy : VOX.red);
      if (cd.body) voxLabel(c, cd.body, VOX_BOX.x0 + 30, hy + 40, 21, VOX.navy);
      for (let k = 0; k < (cd.lines ?? 0); k++) {
        c.fillStyle = 'rgba(20, 33, 61, 0.22)';
        c.fillRect(VOX_BOX.x0 + 30, hy + (cd.body ? 62 : 30) + k * 18,(w - 80) * (k === (cd.lines ?? 0) - 1 ? 0.55 : 0.92), 7);
      }
      c.restore();
    });
    if (p.foot) {
      const a = pop(ts, this.beat(n - 0.4, n));
      if (a > 0) { c.save(); c.globalAlpha = a; voxLabel(c, p.foot, VOX_BOX.x0, VOX_BOX.y1 - 8, 19, VOX.navy); c.restore(); }
    }
  }
}
